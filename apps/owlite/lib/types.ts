export type { PlayResponse, SubtitleTrack } from "@owlite/types";
import type { PlayResponse } from "@owlite/types";

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

export interface LocalMapping {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  local_path: string;
  episode_pattern?: string;
}
