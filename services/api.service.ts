import type {
  LocalMapping,
  PlayResponse,
  ResolveParams,
  SubtitleTrack,
  TmdbEpisode,
  TmdbMedia,
  TmdbSeriesDetails,
  TmdbTvDetails,
  VideoSource,
} from "@/lib/types";
import type { ClientErrorPayload, ClientLogPayload } from "@/lib/observability";
import { request } from "./request";

export { request };

export const tmdb = {
  discover: () => request<{ results: TmdbMedia[] }, "internal_error">("/api/tmdb/discover"),

  search: (query: string, options?: RequestInit) =>
    request<{ results: TmdbMedia[] }, "upstream_error">(
      `/api/tmdb/search?q=${encodeURIComponent(query)}`,
      options,
    ),

  tvEpisodes: (id: number, season: number) =>
    request<{ episodes: TmdbEpisode[] }, "upstream_error">(
      `/api/tmdb/tv/${id}/seasons?season=${season}`,
    ),

  tvSeries: (id: number) =>
    request<TmdbSeriesDetails, "upstream_error">(`/api/tmdb/tv/${id}/seasons`),

  movieDetails: (id: number) => request<TmdbTvDetails, "upstream_error">(`/api/tmdb/movies/${id}`),
  tvDetails: (id: number) => request<TmdbTvDetails, "upstream_error">(`/api/tmdb/tv/${id}`),
  tv: {
    get: (id: number) => request<TmdbTvDetails, "upstream_error">(`/api/tmdb/tv/${id}`),
    imdbId: (id: number) => request<string, "upstream_error">(`/api/tmdb/tv/${id}/imdbId`),
  },
  movie: {
    get: (id: number) => request<TmdbTvDetails, "upstream_error">(`/api/tmdb/movie/${id}`),
    imdbId: (id: number) => request<string, "upstream_error">(`/api/tmdb/movie/${id}/imdbId`),
  },
};

export const sources = {
  list: (tmdbId: number, mediaType: "movie" | "tv") =>
    request<
      {
        sources: Omit<VideoSource, "resolve" | "has">[];
        tmdb_id: number;
        media_type: string;
      },
      "could_not_resolve" | "bad_request" | "not_found"
    >(`/api/sources?tmdb_id=${tmdbId}&media_type=${mediaType}`),

  play: (params: { source_id: string } & Omit<ResolveParams, "userAgent">) =>
    request<PlayResponse, "could_not_resolve" | "bad_request" | "not_found">("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }),
};

export const subtitles = {
  search: (params: {
    imdb_id?: string;
    tmdb_id?: number;
    season?: number;
    episode?: number;
    language?: string;
  }) =>
    request<{ tracks: SubtitleTrack[] }>("/api/subtitles/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }),

  downloadUrl: (fileId: number) => `/api/subtitles/download?file_id=${fileId}`,

  streamUrl: (cacheKey: string) =>
    `/api/subtitles/stream?cache_key=${encodeURIComponent(cacheKey)}`,
};

export const mappings = {
  list: () => request<LocalMapping[]>("/api/mappings"),

  create: (mapping: LocalMapping) =>
    request<LocalMapping, "bad_request">("/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapping),
    }),

  update: (index: number, mapping: LocalMapping) =>
    request<LocalMapping, "bad_request" | "not_found">("/api/mappings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, ...mapping }),
    }),

  remove: (index: number) =>
    request<{ ok: boolean }, "bad_request" | "not_found">(`/api/mappings?index=${index}`, {
      method: "DELETE",
    }),
};

export const observability = {
  reportError: (payload: ClientErrorPayload) =>
    request("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  reportLog: (payload: ClientLogPayload) =>
    request("/api/client-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
