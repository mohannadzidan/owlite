"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "hu", name: "Hungarian" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" },
  { code: "sv", name: "Swedish" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "vi", name: "Vietnamese" },
];

interface SubtitleUploadDialogProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year?: number;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function SubtitleUploadDialog({
  tmdbId,
  type,
  title,
  year,
  onSuccess,
  children,
}: SubtitleUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [submitting, setSubmitting] = useState(false);
  const [fileErrors, setFileErrors] = useState<Array<{ filename: string; reason: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files?.length) return;

    setFileErrors([]);
    setSubmitting(true);

    const filePayloads: Array<{ filename: string; content: string }> = [];
    for (const file of Array.from(files)) {
      const content = await file.text();
      filePayloads.push({ filename: file.name, content });
    }

    try {
      const res = await fetch("/api/subtitles/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type, language, title, year, files: filePayloads }),
      });

      if (res.status === 422) {
        const data = (await res.json()) as { errors: Array<{ filename: string; reason: string }> };
        setFileErrors(data.errors);
        return;
      }

      if (!res.ok) {
        toast.error("Upload failed. Please try again.");
        return;
      }

      toast.success(
        `${filePayloads.length} subtitle${filePayloads.length !== 1 ? "s" : ""} uploaded successfully.`,
      );
      setOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess?.();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <Upload className="size-4" />
            Upload Subtitles
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Upload Subtitles</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Subtitle files</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt,.vtt"
              multiple
              required
              className={cn(
                "text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium",
                "cursor-pointer rounded-md border border-input bg-background px-3 py-1.5",
              )}
            />
          </div>

          {fileErrors.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {fileErrors.map((err) => (
                <li key={err.filename} className="text-xs text-destructive">
                  <span className="font-medium">{err.filename}:</span> {err.reason}
                </li>
              ))}
            </ul>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
