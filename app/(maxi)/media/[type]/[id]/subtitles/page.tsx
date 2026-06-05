import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { tmdb } from "@/services/tmdb.service";
import { paths } from "@/lib/paths";
import { SubtitlesManager } from "@/components/subtitles-manager";
import dayjs from "dayjs";

export default async function SubtitlesPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "movie" && type !== "tv") notFound();

  const numId = Number(id);
  if (isNaN(numId)) notFound();

  if (type === "movie") {
    const details = await tmdb.movies.details(numId);
    if (!details || "error" in details) notFound();

    const year = details.release_date
      ? Number(dayjs(details.release_date).format("YYYY"))
      : undefined;

    return (
      <main className="p-8 pt-16">
        <Link
          href={paths.details("movie", numId)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          {details.title}
        </Link>
        <h1 className="text-2xl font-bold mb-1">{details.title}</h1>
        <p className="text-muted-foreground text-sm mb-8">Subtitle management</p>
        <SubtitlesManager tmdbId={numId} type="movie" title={details.title} year={year} />
      </main>
    );
  }

  const details = await tmdb.tvShows.details(numId);
  if (!details || "error" in details) notFound();

  return (
    <main className="p-8 pt-16">
      <Link
        href={paths.details("tv", numId)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        {details.name}
      </Link>
      <h1 className="text-2xl font-bold mb-1">{details.name}</h1>
      <p className="text-muted-foreground text-sm mb-8">Subtitle management</p>
      <SubtitlesManager tmdbId={numId} type="tv" title={details.name} />
    </main>
  );
}
