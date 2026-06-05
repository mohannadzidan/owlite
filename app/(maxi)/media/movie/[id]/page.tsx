import { notFound } from "next/navigation";
import Image from "next/image";
import { tmdb } from "@/services/tmdb.service";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import Muted from "@/components/typography/muted";
import Heading from "@/components/typography/heading";
import PlayButton from "@/components/play-button";
import { SubtitlesNavButton } from "@/components/subtitles-nav-button";

const BACKDROP = "https://image.tmdb.org/t/p/w1280";
const POSTER = "https://image.tmdb.org/t/p/w500";

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  const details = await tmdb.movies.details(numId, ["credits"]);
  if (!details || "error" in details) notFound();

  return (
    <main className="pt-16 p-8 flex flex-col h-screen">
      {details.backdrop_path && (
        <div className="fixed top-0 left-0 -z-10 w-full h-full">
          <Image
            src={`${BACKDROP}${details.backdrop_path}`}
            alt={details.title}
            fill
            className="object-cover object-top animate-in fade-in zoom-in-125 duration-1000"
            sizes="1080px"
            priority
          />
        </div>
      )}

      <div className="absolute -z-10 inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/20" />
      <div className="absolute -z-10 inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

      <div className="grid grid-cols-[1fr_auto] gap-12 flex-1 items-end pb-4">
        <div className="flex flex-col">
          <h1 className="mb-1 text-6xl font-bold tracking-tight text-white drop-shadow-lg">
            {details.title}
          </h1>

          {details.tagline && <Muted className="mb-5 text-base italic">{details.tagline}</Muted>}

          <section className="mb-5 flex flex-wrap items-center gap-4 text-sm">
            {details.runtime && <span className="text-white/70">{details.runtime} min</span>}
            <span className="text-white/70">{dayjs(details.release_date).format("YYYY")}</span>
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
            <PlayButton type="movie" tmdbId={details.id} />
          </section>
          <SubtitlesNavButton type="movie" id={details.id} />
          {details.overview && (
            <p className="mb-6 max-w-xl text-white/80 leading-relaxed line-clamp-4">
              {details.overview}
            </p>
          )}

          {details.credits.cast.length > 0 && (
            <section className="mb-7">
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

        {details.poster_path && (
          <div className="relative h-80 w-56 shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
            <Image
              src={`${POSTER}${details.poster_path}`}
              alt={details.title}
              fill
              className="object-cover animate-in fade-in duration-700"
              sizes="224px"
            />
          </div>
        )}
      </div>
    </main>
  );
}
