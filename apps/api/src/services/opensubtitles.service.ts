const BASE = "https://api.opensubtitles.com/api/v1";

function authHeaders() {
  const key = process.env.OPENSUBTITLES_API_KEY;
  if (!key) throw new Error("OPENSUBTITLES_API_KEY is not set");
  return {
    "Api-Key": key,
    "Content-Type": "application/json",
    "User-Agent": "owlite v0.0.1",
  };
}

export class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
  }
}

interface SearchParams {
  imdb_id?: string;
  tmdb_id?: number;
  season?: number;
  episode?: number;
  language?: string;
}

export interface SubtitleItem {
  id: string;
  attributes: {
    language: string;
    format: string;
    release: string;
    files: Array<{ file_id: number }>;
  };
}

export interface DownloadLinkResponse {
  link?: string;
  file_name?: string;
}

export const subtitles = {
  search: async (params: SearchParams): Promise<{ data: SubtitleItem[] } | { error: string }> => {
    const qs = new URLSearchParams();
    if (params.imdb_id) qs.set("imdb_id", params.imdb_id.replace("tt", ""));
    if (params.tmdb_id != null) qs.set("tmdb_id", String(params.tmdb_id));
    if (params.season != null) qs.set("season_number", String(params.season));
    if (params.episode != null) qs.set("episode_number", String(params.episode));
    if (params.language) qs.set("languages", params.language);
    const res = await fetch(`${BASE}/subtitles?${qs}`, { headers: authHeaders() });
    if (!res.ok) throw new HttpError(res.status);
    return res.json() as Promise<{ data: SubtitleItem[] }>;
  },
};

export const downloads = {
  link: async (fileId: number): Promise<DownloadLinkResponse> => {
    const res = await fetch(`${BASE}/download`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!res.ok) throw new HttpError(res.status);
    return res.json() as Promise<DownloadLinkResponse>;
  },
};
