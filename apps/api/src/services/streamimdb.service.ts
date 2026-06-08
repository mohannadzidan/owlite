const VAPLAYER_API_URL = process.env.VAPLAYER_API_URL ?? "https://streamdata.vaplayer.ru/api.php";
const JUMP_SERVER = "https://nextgencloudfabric.com";
const JUMP_SERVER_BASE = JUMP_SERVER + "/embed";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function buildReferer(
  imdbId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
): string {
  return mediaType === "tv" && season != null && episode != null
    ? `${JUMP_SERVER_BASE}/tv/${imdbId}/${season}/${episode}`
    : `${JUMP_SERVER_BASE}/movie/${imdbId}`;
}

export interface VaplayerResponse {
  status?: number;
  data?: { stream_urls?: string[]; file_name?: string };
}

export const streams = {
  referer: buildReferer,

  urls: async (
    imdbId: string,
    mediaType: "movie" | "tv",
    season?: number,
    episode?: number,
  ): Promise<VaplayerResponse | { error: unknown }> => {
    const ref = buildReferer(imdbId, mediaType, season, episode);
    const url = new URL(VAPLAYER_API_URL);
    url.searchParams.set("imdb", imdbId);
    url.searchParams.set("type", mediaType === "tv" ? "tv" : "movie");
    if (mediaType === "tv" && season != null && episode != null) {
      url.searchParams.set("season", String(season));
      url.searchParams.set("episode", String(episode));
    }
    try {
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": UA,
          Referer: ref,
          Origin: JUMP_SERVER,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { error: `HTTP ${res.status}` };
      return (await res.json()) as VaplayerResponse;
    } catch (err) {
      return { error: err };
    }
  },

  fetcher:
    (url: string, imdbId: string, mediaType: "movie" | "tv", season?: number, episode?: number) =>
    (signal: AbortSignal) => {
      const ref = buildReferer(imdbId, mediaType, season, episode);
      return fetch(url, {
        headers: {
          "User-Agent": UA,
          Referer: ref,
          Origin: JUMP_SERVER,
        },
        signal,
      });
    },
};
