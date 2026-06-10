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

const getApiBaseUrl = () => `${import.meta.env.VITE_API_URL}/api/v1`;

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
  },
  preferences: {
    get: (profileId: string) =>
      request<PreferencesRecord>(url(`/profiles/${profileId}/preferences`)),
    patch: (profileId: string, patch: Partial<PreferencesRecord>) =>
      request<{ ok: boolean }>(url(`/profiles/${profileId}/preferences`), json("PATCH", patch)),
  },
  progress: {
    get: (profileId: string, params: { tmdbId: number; season?: number; episode?: number }) =>
      request<ProgressRecord | null>(url(`/profiles/${profileId}/progress?${mediaParams(params)}`)),
    patch: (
      profileId: string,
      params: { tmdbId: number; season?: number; episode?: number },
      data: Partial<ProgressRecord>,
    ) =>
      request<{ ok: boolean }>(
        url(`/profiles/${profileId}/progress?${mediaParams(params)}`),
        json("PATCH", data),
      ),
  },
  continueWatching: {
    list: (profileId: string) =>
      request<ContinueWatchingEntry[]>(url(`/profiles/${profileId}/continue-watching`)),
    add: (profileId: string, entry: ContinueWatchingEntry) =>
      request<{ ok: boolean }>(
        url(`/profiles/${profileId}/continue-watching`),
        json("POST", entry),
      ),
    remove: (profileId: string, tmdbId: number) =>
      request<{ ok: boolean }>(
        url(`/profiles/${profileId}/continue-watching?tmdbId=${tmdbId}`),
        json("DELETE"),
      ),
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
    upload: async (data: SubtitlesUploadRequest) => {
      const res = await fetch(url("/subtitles/upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (res.status === 422)
        return body as { errors: Array<{ filename: string; reason: string }> };
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      return body as { ids: number[] };
    },
    setFavorite: (
      payload: { id: number; isFavorite: boolean } | { batchId: string; isFavorite: boolean },
    ) => request<{ ok: boolean }>(url("/subtitles/list"), json("PATCH", payload)),
    delete: (payload: { id?: number; batchId?: string }) =>
      request<{ deleted: number }>(url("/subtitles/list"), json("DELETE", payload)),
  },
  profileSubtitles: {
    get: (profileId: string, params: { tmdbId: number; season?: number; episode?: number }) =>
      request<{ subtitleUrl: string | null }>(
        url(`/profiles/${profileId}/subtitles?${mediaParams(params)}`),
      ),
    patch: (
      profileId: string,
      data: { tmdbId: number; season?: number; episode?: number; subtitleUrl: string },
    ) => request<{ ok: boolean }>(url(`/profiles/${profileId}/subtitles`), json("PATCH", data)),
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
