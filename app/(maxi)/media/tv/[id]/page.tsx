import { notFound } from "next/navigation";
import Image from "next/image";
import { BookmarkIcon, EyeIcon, FilmIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tmdb } from "@/services/tmdb.service";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import EpisodesList from "./episodes-list";
import Muted from "@/components/typography/muted";
import Heading from "@/components/typography/heading";

const BACKDROP = "https://image.tmdb.org/t/p/w1280";

export default async function TvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  const details = await tmdb.tvShows.details(numId, ["credits", "episode_groups"]);
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

      <div className="absolute -z-10 inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
      <div className="absolute -z-10 inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      <div className="grid grid-cols-2 flex-1 overflow-hidden">
        <div>
          <h1 className="mb-2 text-5xl font-bold tracking-tight text-white drop-shadow-lg">
            {details.name}
          </h1>
          <Muted className="max-w-md mb-5">{details.tagline}</Muted>

          <section className="mb-5 flex flex-wrap items-center gap-4 text-sm">
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
          </section>

          {details.genres.length > 0 && (
            <section className="mb-5">
              <Heading>Genres</Heading>
              <div className="flex flex-wrap gap-2">
                {details.genres.map((g) => (
                  <Badge variant="outline" key={g.id}>
                    {g.name}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {details.credits.cast.length > 0 && (
            <section className="mb-5">
              <Heading>Cast</Heading>
              <div className="flex flex-wrap gap-2">
                {details.credits.cast.map((c) => (
                  <Badge variant="outline" key={c.id}>
                    {c.name}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <EpisodesList
            tmdbId={numId}
            overviewFallback={details.overview}
            seasonsCount={details.number_of_seasons}
          />
        </div>
      </div>
    </main>
  );
}
