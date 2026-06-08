export type { PlayResponse, SubtitleTrack, VideoSource, ResolveParams } from "@owlite/types";

export interface LocalMapping {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  local_path: string;
  episode_pattern?: string;
}
