"use client";
import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";
import { ContinueWatchingRecord, storage } from "@/lib/storage";
import { Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PlayButton({ type, tmdbId }: { type: "tv" | "movie"; tmdbId: number }) {
  const [continueWatchingRecord, setContinueWatchingRecord] = useState<
    ContinueWatchingRecord[number] | null
  >(null);

  const text = !continueWatchingRecord ? "Watch Now" : "Play";
  const episode =
    (continueWatchingRecord as Extract<ContinueWatchingRecord[number], { type: "tv" }>)?.episode ??
    1;
  const season =
    (continueWatchingRecord as Extract<ContinueWatchingRecord[number], { type: "tv" }>)?.season ??
    1;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContinueWatchingRecord(
      storage.getContinueWatching().find((record) => record.id === tmdbId) ?? null,
    );
  }, [tmdbId]);

  return (
    <Button size="lg" className="text-xl p-6" asChild>
      <Link
        href={
          type === "tv"
            ? paths.player("tv", tmdbId, { episode, season })
            : paths.player("movie", tmdbId, {})
        }
      >
        <Play /> {text}
        {continueWatchingRecord && type === "tv" && (
          <span className="ms-2 text-white/50 font-medium">
            S{season} E{episode}
          </span>
        )}
      </Link>
    </Button>
  );
}
