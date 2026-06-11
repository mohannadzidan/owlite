import { ChevronLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useLoaderData } from "@tanstack/react-router";
import useSWR from "swr";
import { tmdb } from "@/services/tmdb.service";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import FullScreenButton from "@/components/fullscreen-button";
import SettingsButton from "@/components/settings-button";
import { Separator } from "@/components/ui/separator";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PosterCard } from "./poster-card";
import Hero from "./hero";
import type { Featured } from "./hero";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";
import { useContinueWatching } from "@/hooks/use-continue-watching";
import { useProgress } from "@/hooks/use-progress";
import type { ContinueWatchingEntry } from "@/lib/profile-types";

export const TMDB_IMAGE = "https://image.tmdb.org/t/p/w342";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ContinueWatchingItem({ item }: { item: ContinueWatchingEntry }) {
  const season = item.type === "tv" ? item.season : undefined;
  const episode = item.type === "tv" ? item.episode : undefined;
  const { progress } = useProgress(item.id, season, episode);
  return (
    <Link
      to={"/player/$type/$id"}
      params={{ id: item.id.toString(), type: item.type }}
      search={{
        season: season?.toString(),
        episode: episode?.toString(),
        source: undefined,
      }}
    >
      <PosterCard posterPath={item.poster_path ?? null} alt={item.name} className="mx-auto" />
      {progress && progress.total > 0 && (
        <div className="mt-2 px-4">
          <Progress value={(progress.watched / progress.total) * 100} />
        </div>
      )}
    </Link>
  );
}

export default function HomeClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [toggleSearch, setToggleSearch] = useState(false);
  const searchParams = new URLSearchParams(location.href.split("?")[1] ?? "");
  const debouncedQuery = useDebounce(searchParams.get("q")?.trim() ?? "", 400);
  const query = searchParams.get("q")?.trim();
  const [searchInput, setSearchInput] = useState(query ?? "");

  const { discoverData: initialDiscoverData, continueWatching: initialContinueWatching } =
    useLoaderData({ from: "/" });

  const { continueWatching } = useContinueWatching(initialContinueWatching);

  const { data: discoverData } = useSWR(
    "tmdb-discover",
    async () => {
      const result = await tmdb.trending.trending("all", "day");
      if ("error" in result) throw result;
      return result;
    },
    { fallbackData: initialDiscoverData },
  );

  const trimmedQuery = debouncedQuery.trim();
  const { data: searchData, isLoading: searchLoading } = useSWR(
    trimmedQuery ? ["tmdb-search", trimmedQuery] : null,
    async ([, q]) => {
      const result = await tmdb.search.multi({ query: q });
      return result.results.filter((a) => a.media_type === "movie" || a.media_type === "tv");
    },
  );

  const allResults = discoverData?.results ?? [];
  const movies = allResults.filter((r) => r.media_type === "movie");
  const series = allResults.filter((r) => r.media_type === "tv");
  const searchResults = searchData ?? [];
  const isSearching = !!query;

  const featured = useMemo<Featured | null>(() => {
    if (
      continueWatching.length > 0 &&
      // eslint-disable-next-line react-hooks/purity
      continueWatching[0].lastWatch > Date.now() - 1000 * 60 * 60 * 24 * 2
    ) {
      return { ...continueWatching[0], isContinueWatching: true };
    }
    const topList = movies.length > 0 ? movies[0] : series.length > 0 ? series[0] : null;
    if (topList)
      return {
        id: topList.id,
        type: topList.media_type,
        backdrop_path: topList.backdrop_path,
        name: "title" in topList ? topList.title : topList.name,
        overview: topList.overview,
      };
    return null;
  }, [movies, series, continueWatching]);

  useEffect(() => {
    if (toggleSearch) inputRef.current?.focus();
  }, [toggleSearch]);

  useEffect(() => {
    const currentQ = searchParams.get("q");
    const newQ = searchInput.trim() ? searchInput.replace(/\s+/g, " ") : undefined;

    if (currentQ && !newQ) {
      window.history.back();
    } else if (currentQ && newQ) {
      void navigate({ to: "/", search: { q: newQ } as Record<string, unknown>, replace: true });
    } else if (!currentQ && !newQ) {
      return;
    } else {
      void navigate({ to: "/", search: { q: newQ } as Record<string, unknown> });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <Navigation
        className="fixed top-0 left-0 w-full z-10"
        rightItems={
          <>
            {toggleSearch && (
              <InputGroup className="py-4 -me-2 w-60">
                <InputGroupInput
                  ref={inputRef}
                  placeholder="Search a movie or a TV show"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onBlur={() => setToggleSearch(false)}
                />
                <InputGroupAddon align="inline-end">
                  <Search className="h-5 w-5" />
                </InputGroupAddon>
              </InputGroup>
            )}

            {!toggleSearch && (
              <Button variant="ghost" size="icon" onClick={() => setToggleSearch(true)}>
                <Search className="h-5 w-5" />
              </Button>
            )}

            <Separator orientation="vertical" className="my-4" />
            <SettingsButton />
            <FullScreenButton />
          </>
        }
      >
        {isSearching && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchInput("")}>
              <ChevronLeft />
            </Button>
            Results for {`"${query}"`}
          </div>
        )}
      </Navigation>
      {!isSearching && featured?.backdrop_path && <Hero featured={featured} />}

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-8 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden z-[1] pt-16 pb-16">
        {isSearching ? (
          <section className="flex flex-col items-center">
            <div className=" grid gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9">
              {searchResults.map((result) => (
                <Link
                  key={result.id}
                  to={result.media_type === "movie" ? "/media/movie/$id" : "/media/tv/$id"}
                  params={{ id: result.id.toString() }}
                >
                  <PosterCard
                    key={`${result.media_type}-${result.id}`}
                    posterPath={result.poster_path}
                    alt={result.media_type === "movie" ? result.title : result.name}
                  />
                </Link>
              ))}
            </div>

            {!searchLoading && searchResults.length === 0 && (
              <p className="text-muted-foreground py-10 text-center">No results found.</p>
            )}
          </section>
        ) : (
          <div className="flex flex-col gap-10">
            {continueWatching.length > 0 && (
              <section className="animate-in ">
                <h2>Continue watching</h2>
                <Carousel className="-mx-8">
                  <CarouselContent className="px-8">
                    {continueWatching.slice(0, 12).map((item) => (
                      <CarouselItem key={item.id} className="basis-1/8">
                        <ContinueWatchingItem item={item} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </section>
            )}
            <section>
              <h2>Trending Movies</h2>
              <Carousel className="-mx-8">
                <CarouselContent className="px-8">
                  {movies.map((movie) => (
                    <CarouselItem key={`movie-${movie.id}`} className="basis-1/8">
                      <Link to="/media/movie/$id" params={{ id: movie.id.toString() }}>
                        <PosterCard
                          posterPath={movie.poster_path}
                          alt={movie.title}
                          className="mx-auto"
                        />
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </section>
            <section>
              <h2>Trending Series</h2>
              <Carousel className="-mx-8">
                <CarouselContent className="px-8">
                  {series.map((series) => (
                    <CarouselItem key={`serie-${series.id}`} className="basis-1/8">
                      <Link
                        // to={paths.details(series.media_type, series.id)}
                        to="/media/tv/$id"
                        params={{ id: series.id.toString() }}
                        search={{ season: undefined }}
                      >
                        <PosterCard
                          posterPath={series.poster_path}
                          alt={series.name}
                          className="mx-auto"
                        />
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
