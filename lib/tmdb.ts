import type {
  TmdbCredits,
  TmdbEpisode,
  TmdbMedia,
  TmdbMovieDetails,
  TmdbSeason,
  TmdbSeriesDetails,
  TmdbTvDetails,
} from "@/lib/types";

const BASE = "https://api.themoviedb.org/3";

const TTL = {
  discover: 60 * 60 * 24,
  search: 60 * 60,
  details: 60 * 60 * 24 * 30,
} as const;

function bearerToken() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return key;
}

async function tmdbFetch<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${bearerToken()}`, Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

interface TmdbListResponse {
  results: TmdbMedia[];
}

export async function discoverTrending(): Promise<TmdbMedia[]> {
  const [movies, tv] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/trending/movie/week", TTL.discover),
    tmdbFetch<TmdbListResponse>("/trending/tv/week", TTL.discover),
  ]);
  return [
    ...(movies.results ?? []).map((m) => ({ ...m, media_type: "movie" as const })),
    ...(tv.results ?? []).map((t) => ({ ...t, media_type: "tv" as const })),
  ];
}

export async function searchMulti(query: string): Promise<TmdbMedia[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<TmdbListResponse>(
    `/search/multi?query=${encodeURIComponent(query)}&include_adult=false`,
    TTL.search,
  );
  return (data.results ?? []).filter(
    (r): r is TmdbMedia => r.media_type === "movie" || r.media_type === "tv",
  );
}

export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, TTL.details);
}

export async function getMovieCredits(id: number): Promise<TmdbCredits> {
  return tmdbFetch<TmdbCredits>(`/movie/${id}/credits`, TTL.details);
}

export async function getTvDetails(id: number): Promise<TmdbTvDetails> {
  return tmdbFetch<TmdbTvDetails>(`/tv/${id}`, TTL.details);
}

export async function getTvCredits(id: number): Promise<TmdbCredits> {
  return tmdbFetch<TmdbCredits>(`/tv/${id}/credits`, TTL.details);
}

// kept for backward-compat with the seasons API route
export async function getSeriesDetails(id: number): Promise<TmdbSeriesDetails> {
  const data = await tmdbFetch<{ id: number; name: string; seasons: TmdbSeason[] }>(
    `/tv/${id}`,
    TTL.details,
  );
  return { id: data.id, name: data.name, seasons: data.seasons ?? [] };
}

interface TmdbSeasonRaw {
  episodes: TmdbEpisode[];
}

export async function getSeasonEpisodes(seriesId: number, season: number): Promise<TmdbEpisode[]> {
  const data = await tmdbFetch<TmdbSeasonRaw>(`/tv/${seriesId}/season/${season}`, TTL.details);
  return data.episodes ?? [];
}

interface TmdbExternalIds {
  imdb_id: string | null;
}

export async function getMovieImdbId(id: number): Promise<string | null> {
  const data = await tmdbFetch<TmdbExternalIds>(`/movie/${id}/external_ids`, TTL.details);
  return data.imdb_id;
}

export async function getTvImdbId(id: number): Promise<string | null> {
  const data = await tmdbFetch<TmdbExternalIds>(`/tv/${id}/external_ids`, TTL.details);
  return data.imdb_id;
}
