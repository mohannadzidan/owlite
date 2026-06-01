import { request as requestFn } from "./request";

const VAPLAYER_API_URL = process.env.VAPLAYER_API_URL ?? "https://streamdata.vaplayer.ru/api.php";
const BRIGHTPATH_BASE = "https://brightpathsignals.com/embed";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function buildReferer(
  imdbId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
): string {
  return mediaType === "tv" && season != null && episode != null
    ? `${BRIGHTPATH_BASE}/tv/${imdbId}/${season}/${episode}`
    : `${BRIGHTPATH_BASE}/movie/${imdbId}`;
}

export interface VaplayerResponse {
  status?: number;
  data?: { stream_urls?: string[]; file_name?: string };
}

export const streams = {
  referer: buildReferer,

  urls: (imdbId: string, mediaType: "movie" | "tv", season?: number, episode?: number) => {
    const ref = buildReferer(imdbId, mediaType, season, episode);
    const url = new URL(VAPLAYER_API_URL);
    url.searchParams.set("imdb", imdbId);
    url.searchParams.set("type", mediaType === "tv" ? "tv" : "movie");
    if (mediaType === "tv" && season != null && episode != null) {
      url.searchParams.set("season", String(season));
      url.searchParams.set("episode", String(episode));
    }
    return requestFn<VaplayerResponse>(url.toString(), {
      headers: {
        "User-Agent": UA,
        Referer: ref,
        Origin: "https://brightpathsignals.com",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(10000),
    });
  },

  fetcher:
    (url: string, imdbId: string, mediaType: "movie" | "tv", season?: number, episode?: number) =>
    (signal: AbortSignal) => {
      const ref = buildReferer(imdbId, mediaType, season, episode);
      return fetch(url, {
        headers: {
          "User-Agent": UA,
          Referer: ref,
          Origin: "https://brightpathsignals.com",
        },
        signal,
      });
    },
};
