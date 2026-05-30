"use client";

import Image from "next/image";
import { MaximizeIcon, SearchIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import type { TmdbMedia } from "@/lib/types";

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w342";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function PosterCard({ item }: { item: TmdbMedia }) {
  const router = useRouter();
  const title = item.title ?? item.name ?? "Untitled";
  const posterUrl = item.poster_path ? `${TMDB_IMAGE}${item.poster_path}` : null;

  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex w-36 flex-shrink-0 cursor-pointer flex-col gap-2 outline-none"
      onClick={() => router.push(`/media/${item.media_type}/${item.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/media/${item.media_type}/${item.id}`)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl transition-transform duration-200 group-hover:scale-105 group-focus:scale-105">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="144px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="bg-card text-muted-foreground flex h-full items-center justify-center p-3 text-center text-xs">
            {title}
          </div>
        )}
      </div>
      <p className="text-foreground line-clamp-2 text-center text-xs font-medium leading-snug">
        {title}
      </p>
    </div>
  );
}

function PosterCardSkeleton() {
  return (
    <div className="flex w-36 flex-shrink-0 flex-col gap-2">
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="mx-auto h-3 w-20 rounded" />
    </div>
  );
}

function MediaRow({
  title,
  items,
  loading,
}: {
  title: string;
  items: TmdbMedia[];
  loading: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button className="text-primary text-sm font-medium hover:underline">See All →</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <PosterCardSkeleton key={i} />)
          : items.map((item) => <PosterCard key={`${item.media_type}-${item.id}`} item={item} />)}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<TmdbMedia[]>([]);
  const [series, setSeries] = useState<TmdbMedia[]>([]);
  const [searchResults, setSearchResults] = useState<TmdbMedia[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/tmdb/discover")
      .then((r) => r.json())
      .then((d: { results: TmdbMedia[] }) => {
        const results = d.results ?? [];
        setMovies(results.filter((r) => r.media_type === "movie"));
        setSeries(results.filter((r) => r.media_type === "tv"));
      })
      .catch(() => {})
      .finally(() => setDiscoverLoading(false));
  }, []);

  const runSearch = useCallback((q: string) => {
    abortRef.current?.abort();
    if (!q.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSearchLoading(true);
    fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { results: TmdbMedia[] }) => setSearchResults(d.results ?? []))
      .catch((e: unknown) => {
        if (e instanceof Error && e.name !== "AbortError") setSearchResults([]);
      })
      .finally(() => setSearchLoading(false));
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="flex h-full">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="relative flex h-16 flex-shrink-0 items-center justify-center px-8">
          <div className="w-full max-w-md">
            <div className="border-input bg-input/60 focus-within:border-primary/60 flex items-center gap-2 rounded-full border px-4 py-2.5 backdrop-blur-sm transition-colors">
              <SearchIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              <Input
                placeholder="Search or paste link"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="absolute right-8 flex items-center gap-3">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <MaximizeIcon className="h-5 w-5" />
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <UserIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isSearching ? (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Results for &ldquo;{query}&rdquo;</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {searchLoading
                  ? Array.from({ length: 8 }).map((_, i) => <PosterCardSkeleton key={i} />)
                  : searchResults.map((item) => (
                      <PosterCard key={`${item.media_type}-${item.id}`} item={item} />
                    ))}
              </div>
              {!searchLoading && searchResults.length === 0 && (
                <p className="text-muted-foreground py-10 text-center">No results found.</p>
              )}
            </section>
          ) : (
            <div className="flex flex-col gap-10">
              <MediaRow title="Popular — Movies" items={movies} loading={discoverLoading} />
              <MediaRow title="Popular — Series" items={series} loading={discoverLoading} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
