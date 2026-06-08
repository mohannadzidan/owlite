"use client";
import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import { tmdb } from "@/services/tmdb.service";
import useSWR from "swr";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import EpisodesList from "./episodes-list";
import Muted from "@/components/typography/muted";
import Heading from "@/components/typography/heading";
import PlayButton from "@/components/play-button";
import { SubtitlesNavButton } from "@/components/subtitles-nav-button";
import { useSearchParams } from "next/navigation";

const BACKDROP = "https://image.tmdb.org/t/p/w1280";

function LoadingSkeleton() {
  return <div className="fixed inset-0 bg-black" />;
}

export default function TvDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialSeason = searchParams.get("season") ? Number(searchParams.get("season")) : undefined;

  const { data: details, isLoading } = useSWR(
    !isNaN(Number(id)) ? ["tmdb/tv", Number(id)] : null,
    () => tmdb.tvShows.details(Number(id), ["credits", "episode_groups"]),
  );

  if (isNaN(Number(id))) notFound();
  if (isLoading) return <LoadingSkeleton />;
  if (!details || "error" in details) notFound();

  return (
    <main className="pt-16 p-8 flex flex-col h-screen">
      {details?.backdrop_path && (
        <div className="fixed top-0 left-0 -z-10 w-full h-full">
          <Image
            src={`${BACKDROP}${details.backdrop_path}`}
            alt={details.name}
            fill
            className="object-cover object-top animate-in fade-in zoom-in-125 duration-1000"
            sizes="1080px"
            priority
          />
        </div>
      )}

      <div className="absolute -z-10 inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/20" />
      <div className="absolute -z-10 inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

      <div className="grid grid-cols-2 gap-12 flex-1 overflow-hidden pb-4">
        <div className="flex flex-col self-end">
          <h1 className="mb-1 text-6xl font-bold tracking-tight text-white drop-shadow-lg">
            {details.name}
          </h1>

          {details.tagline && <Muted className="text-base italic">{details.tagline}</Muted>}

          <section className="my-5 flex flex-wrap items-center gap-4 text-sm">
            {details.episode_run_time[0] && (
              <span className="text-white/70">{details.episode_run_time[0]} min</span>
            )}
            <span className="text-white/70">{dayjs(details.first_air_date).format("YYYY")}</span>
            <span className="flex items-center gap-1.5">
              <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs font-bold text-black">
                IMDb
              </span>
              <span className="font-semibold text-white">{details.vote_average.toFixed(1)}</span>
            </span>
            {details.genres.slice(0, 3).map((g: { id: number; name: string }) => (
              <Badge variant="outline" key={g.id} className="text-white/80 border-white/30">
                {g.name}
              </Badge>
            ))}
          </section>
          <section className="my-4 flex items-center gap-3 flex-wrap">
            <PlayButton type="tv" tmdbId={Number(id)} />
          </section>
          <SubtitlesNavButton type="tv" id={Number(id)} />
          {details.overview && (
            <p className="mb-6 max-w-xl text-white/80 leading-relaxed line-clamp-4">
              {details.overview}
            </p>
          )}

          {details.credits.cast.length > 0 && (
            <section className="mb-5">
              <Heading>Cast</Heading>
              <div className="flex flex-wrap gap-2">
                {details.credits.cast.slice(0, 8).map((c: { id: number; name: string }) => (
                  <Badge variant="outline" key={c.id} className="text-white/80 border-white/30">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <EpisodesList
            tmdbId={Number(id)}
            overviewFallback={details.overview}
            seasonsCount={details.number_of_seasons}
            initialSeason={initialSeason}
          />
        </div>
      </div>
    </main>
  );
}
