"use client";

import Image from "next/image";
import ErrorFallback from "@/components/error";
import Muted from "@/components/typography/muted";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { tmdb, tmdbImageUrl } from "@/services/tmdb.service";
import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import Heading from "@/components/typography/heading";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { paths } from "@/lib/paths";
import { Progress } from "@/components/ui/progress";
import { useContinueWatching } from "@/hooks/use-continue-watching";
import { useProgress } from "@/hooks/use-progress";

type TmdbEpisode = {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  runtime: number | null;
  still_path: string;
};

function EpisodeItem({ tmdbId, episode }: { tmdbId: number; episode: TmdbEpisode }) {
  const { progress } = useProgress(tmdbId, episode.season_number, episode.episode_number);
  return (
    <Item
      size="sm"
      asChild
      className="hover:bg-black/20 p-3 last:border-none border-b-white/40 rounded-none"
    >
      <Link
        href={paths.player("tv", tmdbId.toString(), {
          season: episode.season_number,
          episode: episode.episode_number,
        })}
      >
        <ItemMedia>
          <div className="w-10">
            <Muted className="text-xl text-center ">{episode.episode_number}</Muted>
          </div>
          <div>
            <Image
              src={tmdbImageUrl("still", "w185", episode.still_path)}
              className="rounded w-36 h-20 first-letter:object-cover"
              alt={episode.name}
              sizes="185px"
              width={144}
              height={80}
            />
            {progress && progress.total > 0 && (
              <Progress value={(progress.watched / progress.total) * 100} />
            )}
          </div>
        </ItemMedia>
        <ItemContent className="max-h-16">
          <ItemTitle className="flex w-full ">
            <span className="flex-1">{!episode.name.match(/^Episode \d+$/) && episode.name}</span>
            <Muted className="text-xs">{episode.runtime}m</Muted>
          </ItemTitle>
          <ItemDescription className="text-white/70">{episode.overview}</ItemDescription>
        </ItemContent>
      </Link>
    </Item>
  );
}

export interface EpisodesListProps {
  tmdbId: number;
  overviewFallback?: string;
  seasonsCount: number;
  initialSeason?: number;
}

export default function EpisodesList({
  tmdbId,
  overviewFallback,
  seasonsCount,
  initialSeason,
}: EpisodesListProps) {
  const [seasonNumber, setSeasonNumber] = useState(initialSeason ?? 1);
  const { continueWatching } = useContinueWatching();

  useEffect(() => {
    if (initialSeason) return;
    const entry = continueWatching.find((e) => e.type === "tv" && e.id === tmdbId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (entry && entry.type === "tv") setSeasonNumber(entry.season);
  }, [initialSeason, tmdbId, continueWatching]);
  const {
    data: season,
    isLoading,
    error,
    mutate,
    isValidating,
  } = useSWR(
    ["tmdb.tvSeasons.details", tmdbId, seasonNumber],
    () => tmdb.tvSeasons.details({ tvShowID: tmdbId, seasonNumber }),
    { revalidateOnFocus: false },
  );

  if (error) return <div className="flex items-center justify-center h-full"></div>;
  return (
    <>
      <Heading className="mb-2 flex items-center gap-2 text-white">
        Episodes
        {seasonsCount > 1 && (
          <>
            <span>—</span>
            <Select
              value={seasonNumber.toString()}
              onValueChange={(value) => setSeasonNumber(Number(value))}
            >
              <SelectTrigger className="w-32 overflow-hidden text-xs font-semibold uppercase tracking-widest -ms-1.5">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: seasonsCount }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Season {i + 1}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        )}
      </Heading>
      {isLoading && (
        <div className="flex-1 flex justify-center items-center animate-in fade-in duration-1000">
          <Spinner className="w-10 h-10" />
        </div>
      )}

      {error && (
        <div className="flex-1 flex justify-center items-center">
          <ErrorFallback title="Failed to load" message="Could not load episodes list.">
            <Button onClick={() => mutate()} disabled={isValidating}>
              Retry
            </Button>
          </ErrorFallback>
        </div>
      )}

      {season && (
        <>
          <Muted className="text-xs mb-8 animate-in fade-in">
            {season.overview?.length > 0 ? season.overview : overviewFallback}
          </Muted>

          <div
            className="overflow-y-auto flex-1 no-scrollbar animate-in fade-in duration-500"
            data-scrollable
          >
            {season.episodes
              .filter((e) => e.air_date !== null && e.runtime !== null)
              .map((episode) => (
                <EpisodeItem key={episode.id} tmdbId={tmdbId} episode={episode} />
              ))}
          </div>
        </>
      )}
    </>
  );
}
