import { request } from "./request";
import type {
  Profile,
  PreferencesRecord,
  ProgressRecord,
  ContinueWatchingEntry,
  SubtitleTrack,
  SubtitlesUploadRequest,
  PlayResponse,
  ResolveParams,
  LocalMapping,
} from "@owlite/types";

const getApiBaseUrl = () =>
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? "http://localhost:8080")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080");

const url = (path: string) => `${getApiBaseUrl()}${path}`;

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body !== undefined && { body: JSON.stringify(body) }),
});

function mediaParams(p: { tmdbId: number; season?: number; episode?: number }): string {
  const q = new URLSearchParams({ tmdbId: String(p.tmdbId) });
  if (p.season !== undefined) q.set("season", String(p.season));
  if (p.episode !== undefined) q.set("episode", String(p.episode));
  return q.toString();
}

export const apiClient = {
  profiles: {
    list: () => request<Profile[]>(url("/profiles")),
    create: (name: string) => request<Profile>(url("/profiles"), json("POST", { name })),
    update: (id: string, patch: { name?: string; avatarSeed?: string }) =>
      request<{ ok: boolean }>(url(`/profiles/${id}`), json("PATCH", patch)),
    delete: (id: string) => request<{ ok: boolean }>(url(`/profiles/${id}`), { method: "DELETE" }),
    select: (id: string) => request<Profile>(url(`/profiles/${id}/select`), json("POST")),
  },
  preferences: {
    get: () => request<PreferencesRecord>(url("/profile/preferences")),
    patch: (patch: Partial<PreferencesRecord>) =>
      request<{ ok: boolean }>(url("/profile/preferences"), json("PATCH", patch)),
  },
  progress: {
    get: (params: { tmdbId: number; season?: number; episode?: number }) =>
      request<ProgressRecord | null>(url(`/profile/progress?${mediaParams(params)}`)),
    patch: (
      params: { tmdbId: number; season?: number; episode?: number },
      data: Partial<ProgressRecord>,
    ) =>
      request<{ ok: boolean }>(
        url(`/profile/progress?${mediaParams(params)}`),
        json("PATCH", data),
      ),
  },
  continueWatching: {
    list: () => request<ContinueWatchingEntry[]>(url("/profile/continue-watching")),
    add: (entry: ContinueWatchingEntry) =>
      request<{ ok: boolean }>(url("/profile/continue-watching"), json("POST", entry)),
    remove: (tmdbId: number) =>
      request<{ ok: boolean }>(url(`/profile/continue-watching?tmdbId=${tmdbId}`), json("DELETE")),
  },
  subtitles: {
    list: (params: { tmdb_id: number; season?: number; episode?: number }) => {
      const q = new URLSearchParams({ tmdb_id: String(params.tmdb_id) });
      if (params.season !== undefined) q.set("season", String(params.season));
      if (params.episode !== undefined) q.set("episode", String(params.episode));
      return request<{ entries: unknown[] }>(url(`/subtitles/list?${q}`));
    },
    search: (params: {
      imdb_id?: string;
      tmdb_id?: number;
      season?: number;
      episode?: number;
      language?: string;
    }) => request<{ tracks: SubtitleTrack[] }>(url("/subtitles/search"), json("POST", params)),
    downloadUrl: (fileId: number) => url(`/subtitles/download?file_id=${fileId}`),
    streamUrl: (cacheKey: string) =>
      url(`/subtitles/stream?cache_key=${encodeURIComponent(cacheKey)}`),
    upload: (data: SubtitlesUploadRequest) =>
      fetch(url("/subtitles/upload"), { method: "POST", body: JSON.stringify(data) }).then(
        (r) => r.json() as Promise<{ ids: number[] }>,
      ),
    setFavorite: (
      payload: { id: number; isFavorite: boolean } | { batchId: string; isFavorite: boolean },
    ) => request<{ ok: boolean }>(url("/subtitles/list"), json("PATCH", payload)),
    delete: (payload: { id?: number; batchId?: string }) =>
      request<{ deleted: number }>(url("/subtitles/list"), json("DELETE", payload)),
  },
  profileSubtitles: {
    get: (params: { tmdbId: number; season?: number; episode?: number }) =>
      request<{ subtitleUrl: string | null }>(url(`/profile/subtitles?${mediaParams(params)}`)),
    patch: (data: { tmdbId: number; season?: number; episode?: number; subtitleUrl: string }) =>
      request<{ ok: boolean }>(url("/profile/subtitles"), json("PATCH", data)),
  },
  media: {
    sources: () => request<{ id: string; name: string; description?: string }[]>(url("/sources")),
    play: (params: { source_id: string } & Omit<ResolveParams, "userAgent">) =>
      request<PlayResponse>(url("/play"), json("POST", params)),
    streamUrl: (filePath: string) => url(`/stream?path=${encodeURIComponent(filePath)}`),
    hlsProxyUrl: (p: string) => url(`/hls-proxy?p=${p}`),
    hlsSegmentUrl: (p: string) => url(`/hls-segment?p=${p}`),
  },
  mappings: {
    list: () => request<LocalMapping[]>(url("/mappings")),
    create: (mapping: LocalMapping) =>
      request<LocalMapping>(url("/mappings"), json("POST", mapping)),
    update: (tmdbId: number, patch: Partial<LocalMapping>) =>
      request<{ ok: boolean }>(url("/mappings"), json("PUT", { tmdb_id: tmdbId, ...patch })),
    remove: (tmdbId: number) =>
      request<{ ok: boolean }>(url("/mappings"), json("DELETE", { tmdb_id: tmdbId })),
  },
  observability: {
    reportError: (payload: unknown) => request(url("/client-errors"), json("POST", payload)),
    reportLog: (payload: unknown) => request(url("/client-logs"), json("POST", payload)),
  },
};

export { url, request };
