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
import { request, post } from "./request";

export { request };

export const tmdb = {
  discover: () => request<{ results: TmdbMedia[] }>("/api/tmdb/discover"),

  search: (query: string, options?: RequestInit) =>
    request<{ results: TmdbMedia[] }>(`/api/tmdb/search?q=${encodeURIComponent(query)}`, options),

  tvDetails: (id: number) => request<TmdbTvDetails>(`/api/tmdb/tv/${id}/seasons`),

  tvEpisodes: (id: number, season: number) =>
    request<{ episodes: TmdbEpisode[] }>(`/api/tmdb/tv/${id}/seasons?season=${season}`),

  tvSeries: (id: number) => request<TmdbSeriesDetails>(`/api/tmdb/tv/${id}/seasons`),
};

export const sources = {
  list: (tmdbId: number, mediaType: "movie" | "tv") =>
    request<{ sources: Omit<VideoSource, "resolve">[]; tmdb_id: number; media_type: string }>(
      `/api/sources?tmdb_id=${tmdbId}&media_type=${mediaType}`,
    ),

  play: (params: { source_id: string } & Omit<ResolveParams, "userAgent">) =>
    request<PlayResponse>("/api/play", {
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
    request<LocalMapping>("/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapping),
    }),

  update: (index: number, mapping: LocalMapping) =>
    request<LocalMapping>("/api/mappings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, ...mapping }),
    }),

  remove: (index: number) =>
    request<{ ok: boolean }>(`/api/mappings?index=${index}`, { method: "DELETE" }),
};

export const observability = {
  reportError: (payload: ClientErrorPayload) => post("/api/client-errors", payload),
  reportLog: (payload: ClientLogPayload) => post("/api/client-logs", payload),
};
