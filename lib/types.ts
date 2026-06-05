export interface VideoSource {
  id: string;
  name: string;
  priority: number;
  description?: string;
  resolve: (params: ResolveParams) => Promise<PlayResponse | null>;
  has: (params: Omit<ResolveParams, "screenSize" | "userAgent">) => Promise<boolean>;
}

export interface ResolveParams {
  screenSize: number;
  userAgent: string;
  media_type: "movie" | "tv";
  season?: number;
  episode?: number;
  imdb_id: string;
}

export type PlayResponse =
  | {
      type: "direct_video";
      url: string;
      subtitles_url?: string;
      metadata: { title?: string; [key: string]: unknown };
    }
  | { type: "hls"; master_manifest_url: string; fileName?: string }
  | { type: "external_url"; url: string };

export interface LocalMapping {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  local_path: string;
  episode_pattern?: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  format: string;
  download_url: string;
  release_name?: string;
  provider: "local" | "open_subtitles";
  isFavorite?: boolean;
}
