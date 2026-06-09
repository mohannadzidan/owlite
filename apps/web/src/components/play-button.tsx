import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";
import { useContinueWatching } from "@/hooks/use-continue-watching";
import { Play } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function PlayButton({ type, tmdbId }: { type: "tv" | "movie"; tmdbId: number }) {
  const { continueWatching } = useContinueWatching();
  const record = continueWatching.find((r) => r.id === tmdbId) ?? null;

  const text = !record ? "Watch Now" : "Play";
  const episode = record?.type === "tv" ? record.episode : 1;
  const season = record?.type === "tv" ? record.season : 1;

  return (
    <Button size="lg" className="text-xl p-6" asChild>
      <Link
        to={
          type === "tv"
            ? paths.player("tv", tmdbId, { episode, season })
            : paths.player("movie", tmdbId, {})
        }
      >
        <Play /> {text}
        {record && type === "tv" && (
          <span className="ms-2 text-white/50 font-medium">
            S{season} E{episode}
          </span>
        )}
      </Link>
    </Button>
  );
}
