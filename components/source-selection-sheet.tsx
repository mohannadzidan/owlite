"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlayResponse, ResolveParams } from "@/lib/types";
import { sources as sourcesApi } from "@/services/api.service";
import ErrorFallback from "@/components/error";

interface SourceInfo {
  id: string;
  name: string;
  priority: number;
}

interface Props {
  open: boolean;
  resolveParams: ResolveParams | null;
  onResolved: (response: PlayResponse) => void;
  onCancel: () => void;
}

export function SourceSelectionSheet({ open, resolveParams, onResolved, onCancel }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const {
    data: sourcesData,
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useSWR(
    open && resolveParams ? ["sources", resolveParams.tmdb_id, resolveParams.media_type] : null,
    async () => {
      const result = await sourcesApi.list(resolveParams!.tmdb_id, resolveParams!.media_type);
      if ("error" in result) throw result;
      return result;
    },
  );

  const sources: SourceInfo[] = sourcesData?.sources ?? [];

  async function selectSource(sourceId: string) {
    if (!resolveParams) return;
    setLoading(sourceId);
    setPlayError(null);
    try {
      const result = await sourcesApi.play({
        source_id: sourceId,
        ...resolveParams,
        screenSize: window.screen.height,
      });
      if ("error" in result) throw result;
      onResolved(result);
    } catch {
      setPlayError("Failed to play from this source. Try another.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="bottom" className="mx-auto max-w-xl rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Choose a source</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-3">
          {playError && <p className="text-destructive text-sm">{playError}</p>}
          {sourcesError ? (
            <ErrorFallback title="Failed to load" message="Could not load available sources." />
          ) : sourcesLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </>
          ) : sources.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sources available.</p>
          ) : (
            sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-base font-medium">{s.name}</span>
                <Button size="lg" disabled={loading === s.id} onClick={() => selectSource(s.id)}>
                  {loading === s.id ? "Loading…" : "Select"}
                </Button>
              </div>
            ))
          )}
          <Button variant="outline" size="lg" className="mt-2" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
