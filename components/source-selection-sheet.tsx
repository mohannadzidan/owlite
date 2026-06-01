"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PlayResponse, ResolveParams } from "@/lib/types";
import { sources as sourcesApi } from "@/services/api.service";

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
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !resolveParams) return;
    setError(null);
    sourcesApi
      .list(resolveParams.tmdb_id, resolveParams.media_type)
      .then((d) => setSources(d.sources))
      .catch(() => setError("Failed to load sources"));
  }, [open, resolveParams]);

  async function selectSource(sourceId: string) {
    if (!resolveParams) return;
    setLoading(sourceId);
    setError(null);
    try {
      const data = await sourcesApi.play({
        source_id: sourceId,
        ...resolveParams,
        screenSize: window.screen.height,
      });
      onResolved(data);
    } catch {
      setError("Failed to play from this source. Try another.");
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
          {error && <p className="text-destructive text-sm">{error}</p>}
          {sources.length === 0 && !error && (
            <p className="text-muted-foreground text-sm">No sources available.</p>
          )}
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <span className="text-base font-medium">{s.name}</span>
              <Button size="lg" disabled={loading === s.id} onClick={() => selectSource(s.id)}>
                {loading === s.id ? "Loading…" : "Select"}
              </Button>
            </div>
          ))}
          <Button variant="outline" size="lg" className="mt-2" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
