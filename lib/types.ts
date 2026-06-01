export interface TmdbMedia {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  overview: string;
  vote_average: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: Array<{ id: number; name: string; job: string }>;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: TmdbGenre[];
  vote_average: number;
  imdb_id: string | null;
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  season_number: number;
  air_date: string | null;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  episodes?: TmdbEpisode[];
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  episode_run_time: number[];
  genres: TmdbGenre[];
  seasons: TmdbSeason[];
  vote_average: number;
}

export interface TmdbSeriesDetails {
  id: number;
  name: string;
  seasons: TmdbSeason[];
}

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
  tmdb_id: number;
  media_type: "movie" | "tv";
  season?: number;
  episode?: number;
  imdb_id?: string;
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
}
