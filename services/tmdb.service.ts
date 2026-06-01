import type {
  TmdbCredits,
  TmdbEpisode,
  TmdbMedia,
  TmdbMovieDetails,
  TmdbSeason,
  TmdbSeriesDetails,
  TmdbTvDetails,
} from "@/lib/types";
import { request as requestFn } from "./request";

const BASE = "https://api.themoviedb.org/3";

const TTL = {
  discover: 60 * 60 * 24,
  search: 60 * 60,
  details: 60 * 60 * 24 * 30,
} as const;

function authHeaders() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

const request = <T>(path: string, init?: RequestInit) =>
  requestFn<T>(`${BASE}${path}`, { headers: authHeaders(), ...init });

interface TmdbListResponse {
  results: TmdbMedia[];
}

export const discover = {
  trending: async (): Promise<TmdbMedia[]> => {
    const [moviesRes, tvRes] = await Promise.all([
      request<TmdbListResponse>("/trending/movie/week", { next: { revalidate: TTL.discover } }),
      request<TmdbListResponse>("/trending/tv/week", { next: { revalidate: TTL.discover } }),
    ]);
    return [
      ...(moviesRes.results ?? []).map((m) => ({ ...m, media_type: "movie" as const })),
      ...(tvRes.results ?? []).map((t) => ({ ...t, media_type: "tv" as const })),
    ];
  },
};

export const search = {
  multi: async (query: string): Promise<TmdbMedia[]> => {
    if (!query.trim()) return [];
    const data = await request<TmdbListResponse>(
      `/search/multi?query=${encodeURIComponent(query)}&include_adult=false`,
      { next: { revalidate: TTL.search } },
    );
    return (data.results ?? []).filter(
      (r): r is TmdbMedia => r.media_type === "movie" || r.media_type === "tv",
    );
  },
};

export const movies = {
  details: (id: number) =>
    request<TmdbMovieDetails>(`/movie/${id}`, { next: { revalidate: TTL.details } }),

  credits: (id: number) =>
    request<TmdbCredits>(`/movie/${id}/credits`, { next: { revalidate: TTL.details } }),

  imdbId: async (id: number): Promise<string | null> => {
    const data = await request<{ imdb_id: string | null }>(`/movie/${id}/external_ids`, {
      next: { revalidate: TTL.details },
    });
    return data.imdb_id;
  },
};

export const tv = {
  details: (id: number) =>
    request<TmdbTvDetails>(`/tv/${id}`, { next: { revalidate: TTL.details } }),

  credits: (id: number) =>
    request<TmdbCredits>(`/tv/${id}/credits`, { next: { revalidate: TTL.details } }),

  series: async (id: number): Promise<TmdbSeriesDetails> => {
    const data = await request<{ id: number; name: string; seasons: TmdbSeason[] }>(`/tv/${id}`, {
      next: { revalidate: TTL.details },
    });
    return { id: data.id, name: data.name, seasons: data.seasons ?? [] };
  },

  seasonEpisodes: async (seriesId: number, season: number): Promise<TmdbEpisode[]> => {
    const data = await request<{ episodes: TmdbEpisode[] }>(`/tv/${seriesId}/season/${season}`, {
      next: { revalidate: TTL.details },
    });
    return data.episodes ?? [];
  },

  imdbId: async (id: number): Promise<string | null> => {
    const data = await request<{ imdb_id: string | null }>(`/tv/${id}/external_ids`, {
      next: { revalidate: TTL.details },
    });
    return data.imdb_id;
  },
};
