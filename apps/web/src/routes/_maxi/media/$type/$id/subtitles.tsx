import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import dayjs from "dayjs";
import { tmdb } from "@/services/tmdb.service";
import { SubtitlesManager } from "@/components/subtitles-manager";
import FullScreenSpinner from "@/components/fullscreen-spinner";

export const Route = createFileRoute("/_maxi/media/$type/$id/subtitles")({
  loader: async ({ params: { type, id } }) => {
    const numId = Number(id);
    if (isNaN(numId)) throw notFound();
    if (type === "movie") {
      const details = await tmdb.movies.details(numId);
      if ("error" in details) throw notFound();
      return { type: "movie" as const, details };
    }
    if (type === "tv") {
      const details = await tmdb.tvShows.details(numId);
      if ("error" in details) throw notFound();
      return { type: "tv" as const, details };
    }
    throw notFound();
  },
  pendingComponent: FullScreenSpinner,
  component: SubtitlesPage,
});

function SubtitlesPage() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const numId = Number(id);

  if (loaderData.type === "movie") {
    const { details } = loaderData;
    const year = details.release_date
      ? Number(dayjs(details.release_date).format("YYYY"))
      : undefined;

    return (
      <main className="p-8 pt-16">
        <Link
          to={"/media/movie/$id"}
          params={{ id }}
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

  const { details } = loaderData;

  return (
    <main className="p-8 pt-16">
      <Link
        to={"/media/tv/$id"}
        params={{ id }}
        search={{ season: undefined }}
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
