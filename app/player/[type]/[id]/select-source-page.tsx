"use client";
import ErrorFallback from "@/components/error";
import FullScreenSpinner from "@/components/fullscreen-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { paths } from "@/lib/paths";
import { sources } from "@/services/api.service";
import { BadgeCheckIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

export interface SelectSourceDialogProps {
  type: "tv" | "movie";
  season?: string;
  episode?: string;
  id: string;
}

export default function SelectSourceDialog({ type, season, episode, id }: SelectSourceDialogProps) {
  const {
    data: sourcesList,
    error,
    isLoading,
    mutate,
  } = useSWR([type, id, season, episode], async () => {
    const result = await sources.list(parseInt(id), type!);
    if ("error" in result) throw result;
    return result;
  });
  const router = useRouter();
  // useEffect(() => {
  //   if (sourcesList?.sources.length === 1) {
  //     router.push(
  //       paths.player(type as "movie", id, {
  //         season,
  //         episode,
  //         source: sourcesList.sources[0].id,
  //       }),
  //     );
  //   }
  // }, [sourcesList, router, type, id, season, episode]);

  if (error) {
    return (
      <ErrorFallback
        title="Failed to load sources"
        message="An error occurred while fetching sources. Please try again."
      >
        <Button onClick={() => mutate()}>Try again</Button>
      </ErrorFallback>
    );
  }
  if (isLoading) {
    return <FullScreenSpinner className="bg-black" />;
  }

  return (
    <div className="flex items-center justify-center h-screen w-screen flex-col gap-4 container mx-auto max-w-xl p-4">
      <h1 className="font-semibold text-lg">Select a source</h1>
      <div className="w-full flex flex-col gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
        {sourcesList?.sources.map((s) => (
          <Item key={s.id} variant="outline" size="default" asChild>
            <Link
              key={s.id}
              href={paths.player(type as "movie", id, {
                season,
                episode,
                source: s.id,
              })}
              replace
            >
              <ItemMedia>
                <BadgeCheckIcon className="size-5" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{s.name}</ItemTitle>
                <ItemDescription>{s.description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon className="size-4" />
              </ItemActions>
            </Link>
          </Item>
        ))}
      </div>
    </div>
  );
}
