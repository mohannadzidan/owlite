import { VideoSource } from "@/lib/types";

export default async function Resolver({
  source,
  userAgent,
  season,
  episode,
  screen,
  id,
  type,
}: {
  source: VideoSource;
  userAgent: string;
  type: "tv" | "movie";
  season?: string;
  episode?: string;
  screen: number;
  id: string;
}) {
  const sourceProvides = await source.resolve({
    userAgent,
    tmdb_id: parseInt(id),
    media_type: type,
    season: season ? parseInt(season) : undefined,
    episode: episode ? parseInt(episode) : undefined,
    screenSize: Number(screen),
  });
  return <div>JSON: {JSON.stringify(sourceProvides)}</div>;
}
