"use client";

import { useState } from "react";
import useSWR from "swr";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDown, ChevronUp, FolderOpen, HardDrive, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SubtitleUploadDialog } from "@/components/subtitle-upload-dialog";
import { cn } from "@/lib/utils";
import type { SubtitleEntry, SubtitleFileRow } from "@owlite/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function episodeLabel(season: number | null, episode: number | null) {
  if (season != null && episode != null)
    return `S${String(season).padStart(2, "0")} E${String(episode).padStart(2, "0")}`;
  if (season != null) return `S${String(season).padStart(2, "0")}`;
  return null;
}

function StarButton({
  active,
  onClick,
  className,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-7 shrink-0", className)}
      onClick={onClick}
    >
      <Star
        className={cn(
          "size-3.5",
          active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
        )}
      />
    </Button>
  );
}

function DeleteButton({
  title,
  description,
  onConfirm,
  deleting,
  className,
}: {
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  deleting: boolean;
  className?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-7 shrink-0", className)}
          disabled={deleting}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SingleRow({
  entry,
  onDeleted,
  onFavoriteToggled,
}: {
  entry: SubtitleEntry & { kind: "single" };
  onDeleted: () => void;
  onFavoriteToggled: (id: number, val: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/subtitles/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      if (!res.ok) throw new Error();
      onDeleted();
    } catch {
      toast.error("Failed to delete subtitle.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !entry.isFavorite;
    onFavoriteToggled(entry.id, next);
    try {
      const res = await fetch("/api/subtitles/list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, isFavorite: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      onFavoriteToggled(entry.id, !next);
      toast.error("Failed to update favorite.");
    }
  };

  const ep = episodeLabel(entry.season, entry.episode);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-md hover:bg-muted/50 group">
      <HardDrive className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm truncate" title={entry.filename}>
        {entry.filename}
      </span>
      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
        <span className="uppercase font-medium">{entry.language}</span>
        {ep && <span>{ep}</span>}
        <span>{formatDate(entry.createdAt)}</span>
      </div>
      <StarButton active={entry.isFavorite} onClick={handleFavorite} />
      <DeleteButton
        title="Delete subtitle?"
        description="This will permanently remove the file from disk."
        onConfirm={handleDelete}
        deleting={deleting}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

function FileRow({
  file,
  onDeleted,
  onFavoriteToggled,
}: {
  file: SubtitleFileRow;
  onDeleted: () => void;
  onFavoriteToggled: (id: number, val: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/subtitles/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id }),
      });
      if (!res.ok) throw new Error();
      onDeleted();
    } catch {
      toast.error("Failed to delete subtitle.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !file.isFavorite;
    onFavoriteToggled(file.id, next);
    try {
      const res = await fetch("/api/subtitles/list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, isFavorite: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      onFavoriteToggled(file.id, !next);
      toast.error("Failed to update favorite.");
    }
  };

  const ep = episodeLabel(file.season, file.episode);

  return (
    <div className="flex items-center gap-2 pl-7 pr-3 py-2 rounded-md hover:bg-muted/30 group">
      <span className="flex-1 text-xs truncate text-muted-foreground" title={file.filename}>
        {file.filename}
      </span>
      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
        {ep && <span>{ep}</span>}
      </div>
      <StarButton active={file.isFavorite} onClick={handleFavorite} className="size-6" />
      <DeleteButton
        title="Delete subtitle?"
        description="This will permanently remove the file from disk."
        onConfirm={handleDelete}
        deleting={deleting}
        className="size-6 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

function BatchRow({
  entry,
  onDeleted,
  onFileDeleted,
  onFileFavoriteToggled,
  onBatchFavoriteToggled,
}: {
  entry: SubtitleEntry & { kind: "batch" };
  onDeleted: () => void;
  onFileDeleted: (id: number) => void;
  onFileFavoriteToggled: (id: number, val: boolean) => void;
  onBatchFavoriteToggled: (batchId: string, val: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const allFavorited = entry.files.length > 0 && entry.files.every((f) => f.isFavorite);

  const handleDeleteBatch = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/subtitles/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: entry.batchId }),
      });
      if (!res.ok) throw new Error();
      onDeleted();
    } catch {
      toast.error("Failed to delete batch.");
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !allFavorited;
    onBatchFavoriteToggled(entry.batchId, next);
    try {
      const res = await fetch("/api/subtitles/list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: entry.batchId, isFavorite: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      onBatchFavoriteToggled(entry.batchId, !next);
      toast.error("Failed to update favorite.");
    }
  };

  return (
    <AccordionItem value={entry.batchId} className="border-none">
      <AccordionPrimitive.Header className="flex items-center rounded-md hover:bg-muted/50 group">
        <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-sm text-left outline-none">
          <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:hidden" />
          <ChevronUp className="size-4 shrink-0 text-muted-foreground hidden group-data-[state=open]:block" />
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-medium">Batch · {entry.files.length} files</span>
          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
            <span className="uppercase font-medium">{entry.language}</span>
            <span>{formatDate(entry.createdAt)}</span>
          </div>
        </AccordionPrimitive.Trigger>
        <StarButton active={allFavorited} onClick={handleBatchFavorite} className="mr-0.5" />
        <DeleteButton
          title="Delete batch?"
          description={`This will permanently remove all ${entry.files.length} files in this group.`}
          onConfirm={handleDeleteBatch}
          deleting={deleting}
          className="opacity-0 group-hover:opacity-100 mr-1"
        />
      </AccordionPrimitive.Header>
      <AccordionContent className="pb-0">
        <div className="flex flex-col pb-2">
          {entry.files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              onDeleted={() => onFileDeleted(file.id)}
              onFavoriteToggled={onFileFavoriteToggled}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface SubtitlesManagerProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year?: number;
}

export function SubtitlesManager({ tmdbId, type, title, year }: SubtitlesManagerProps) {
  const { data, mutate } = useSWR<{ entries: SubtitleEntry[] }>(
    `/api/subtitles/list?tmdb_id=${tmdbId}`,
    (url: string) => fetch(url).then((r) => r.json()),
  );

  const entries = data?.entries ?? [];

  const removeEntry = (batchIdOrId: string | number) => {
    if (!data) return;
    mutate(
      {
        entries: data.entries.filter((e) =>
          e.kind === "single" ? e.id !== batchIdOrId : e.batchId !== batchIdOrId,
        ),
      },
      false,
    );
  };

  const removeFile = (fileId: number) => {
    if (!data) return;
    mutate(
      {
        entries: data.entries.flatMap((e): SubtitleEntry[] => {
          if (e.kind === "single") return e.id === fileId ? [] : [e];
          const remaining = e.files.filter((f) => f.id !== fileId);
          if (remaining.length === 0) return [];
          return [{ ...e, files: remaining }];
        }),
      },
      false,
    );
  };

  const toggleFavorite = (id: number, val: boolean) => {
    if (!data) return;
    mutate(
      {
        entries: data.entries.map((e): SubtitleEntry => {
          if (e.kind === "single") {
            if (e.id === id) return { ...e, isFavorite: val };
            // clear conflicting favorites for same (language, season, episode)
            const target = data.entries.find((x) => x.kind === "single" && x.id === id);
            if (
              val &&
              target &&
              target.kind === "single" &&
              e.language === target.language &&
              e.season === target.season &&
              e.episode === target.episode
            ) {
              return { ...e, isFavorite: false };
            }
            return e;
          }
          return {
            ...e,
            files: e.files.map((f) => {
              if (f.id === id) return { ...f, isFavorite: val };
              const targetFile = e.files.find((x) => x.id === id);
              if (
                val &&
                targetFile &&
                f.language === targetFile.language &&
                f.season === targetFile.season &&
                f.episode === targetFile.episode
              ) {
                return { ...f, isFavorite: false };
              }
              return f;
            }),
          };
        }),
      },
      false,
    );
  };

  const toggleBatchFavorite = (batchId: string, val: boolean) => {
    if (!data) return;
    mutate(
      {
        entries: data.entries.map((e): SubtitleEntry => {
          if (e.kind === "batch" && e.batchId === batchId) {
            return { ...e, files: e.files.map((f) => ({ ...f, isFavorite: val })) };
          }
          if (!val) return e;
          const batchEntry = data.entries.find((x) => x.kind === "batch" && x.batchId === batchId);
          if (!batchEntry || batchEntry.kind !== "batch") return e;
          if (e.kind === "single") {
            const conflict = batchEntry.files.some(
              (f) => f.language === e.language && f.season === e.season && f.episode === e.episode,
            );
            return conflict ? { ...e, isFavorite: false } : e;
          }
          return {
            ...e,
            files: e.files.map((f) => {
              const conflict = batchEntry.files.some(
                (bf) =>
                  bf.language === f.language && bf.season === f.season && bf.episode === f.episode,
              );
              return conflict ? { ...f, isFavorite: false } : f;
            }),
          };
        }),
      },
      false,
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entries.length === 0
            ? "No subtitles yet."
            : `${entries.length} item${entries.length !== 1 ? "s" : ""}`}
        </p>
        <SubtitleUploadDialog
          tmdbId={tmdbId}
          type={type}
          title={title}
          year={year}
          onSuccess={() => mutate()}
        >
          <Button variant="outline" size="sm">
            <Upload className="size-4" />
            Upload Subtitles
          </Button>
        </SubtitleUploadDialog>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <HardDrive className="size-10 opacity-30" />
          <p className="text-sm">No local subtitles for this title.</p>
        </div>
      ) : (
        <AccordionPrimitive.Root type="multiple" className="flex flex-col gap-1">
          {entries.map((entry) =>
            entry.kind === "single" ? (
              <SingleRow
                key={entry.id}
                entry={entry}
                onDeleted={() => removeEntry(entry.id)}
                onFavoriteToggled={toggleFavorite}
              />
            ) : (
              <BatchRow
                key={entry.batchId}
                entry={entry}
                onDeleted={() => removeEntry(entry.batchId)}
                onFileDeleted={removeFile}
                onFileFavoriteToggled={toggleFavorite}
                onBatchFavoriteToggled={toggleBatchFavorite}
              />
            ),
          )}
        </AccordionPrimitive.Root>
      )}
    </div>
  );
}
