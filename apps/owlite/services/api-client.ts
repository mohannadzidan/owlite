import { request } from "./request";
import type {
  Profile,
  PreferencesRecord,
  ProgressRecord,
  ContinueWatchingEntry,
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
  profileSubtitles: {
    get: (params: { tmdbId: number; season?: number; episode?: number }) =>
      request<{ subtitleUrl: string | null }>(url(`/profile/subtitles?${mediaParams(params)}`)),
    patch: (data: { tmdbId: number; season?: number; episode?: number; subtitleUrl: string }) =>
      request<{ ok: boolean }>(url("/profile/subtitles"), json("PATCH", data)),
  },
};

export { url, request };
