export type PlayResponse =
  | {
      type: "direct_video";
      url: string;
      subtitles_url?: string;
      metadata: { title?: string; [key: string]: unknown };
    }
  | { type: "hls"; master_manifest_url: string; fileName?: string }
  | { type: "external_url"; url: string };

export type SubtitleFileRow = {
  id: number;
  filename: string;
  language: string;
  season: number | null;
  episode: number | null;
  isFavorite: boolean;
  createdAt: string;
};

export type SubtitleEntry =
  | ({ kind: "single" } & SubtitleFileRow)
  | {
      kind: "batch";
      batchId: string;
      files: SubtitleFileRow[];
      language: string;
      createdAt: string;
    };

export type SubtitleTrack = {
  id: string;
  language: string;
  format: string;
  download_url: string;
  release_name?: string;
  provider: "local" | "open_subtitles";
  isFavorite?: boolean;
};
