"use client";
import ErrorFallback from "@/components/error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { paths } from "@/lib/paths";
import { sources } from "@/services/api.service";
import Link from "next/link";
import { useState } from "react";
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
  if (isLoading || !sourcesList) {
    return <div>Loading sources...</div>;
  }
  return (
    <div>
      <h1>Select a source</h1>
      {sourcesList?.sources.map((s) => (
        <Link
          key={s.id}
          href={paths.player(type as "movie", id, {
            season,
            episode,
            source: s.id,
          })}
          prefetch={false}
        >
          {s.name} {s.description ? ` - ${s.description}` : ""}
        </Link>
      ))}
    </div>
  );
}
