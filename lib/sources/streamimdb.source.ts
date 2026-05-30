import { getMovieImdbId, getTvImdbId } from "@/lib/tmdb";
import type { PlayResponse, ResolveParams, VideoSource } from "@/lib/types";

const VAPLAYER_API_URL = process.env.VAPLAYER_API_URL ?? "https://streamdata.vaplayer.ru/api.php";
const BRIGHTPATH_BASE = "https://brightpathsignals.com/embed";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function resolveImdbId(params: ResolveParams): Promise<string | null> {
  if (params.imdb_id) return params.imdb_id;
  try {
    return params.media_type === "movie"
      ? await getMovieImdbId(params.tmdb_id)
      : await getTvImdbId(params.tmdb_id);
  } catch {
    return null;
  }
}

function makeReferer(
  imdbId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
): string {
  if (mediaType === "tv" && season != null && episode != null) {
    return `${BRIGHTPATH_BASE}/tv/${imdbId}/${season}/${episode}`;
  }
  return `${BRIGHTPATH_BASE}/movie/${imdbId}`;
}

function parseBestVariant(body: string, masterUrl: string): string | null {
  const lines = body.split("\n");
  let bestBandwidth = -1;
  let bestUrl: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const bwMatch = line.match(/BANDWIDTH=(\d+)/);
    const bandwidth = bwMatch ? parseInt(bwMatch[1]) : 0;
    const urlLine = lines[i + 1]?.trim();
    if (!urlLine || urlLine.startsWith("#")) continue;
    if (bandwidth > bestBandwidth) {
      bestBandwidth = bandwidth;
      try {
        bestUrl = new URL(urlLine, masterUrl).href;
      } catch {
        bestUrl = urlLine;
      }
    }
  }
  return bestUrl;
}

function encodeProxy(u: string, r: string): string {
  return Buffer.from(JSON.stringify({ u, r })).toString("base64url");
}

interface VaplayerResponse {
  status?: number;
  data?: { stream_urls?: string[] };
}

async function fetchBestStreamUrl(
  imdbId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
): Promise<string | null> {
  const referer = makeReferer(imdbId, mediaType, season, episode);

  const apiUrl = new URL(VAPLAYER_API_URL);
  apiUrl.searchParams.set("imdb", imdbId);
  apiUrl.searchParams.set("type", mediaType === "tv" ? "tv" : "movie");
  if (mediaType === "tv" && season != null && episode != null) {
    apiUrl.searchParams.set("season", String(season));
    apiUrl.searchParams.set("episode", String(episode));
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(apiUrl.toString(), {
      headers: {
        "User-Agent": UA,
        Referer: referer,
        Origin: "https://brightpathsignals.com",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return null;
  }

  if (!apiRes.ok) return null;
  const body = (await apiRes.json()) as VaplayerResponse;
  const streamUrls = body?.data?.stream_urls;
  if (!Array.isArray(streamUrls) || streamUrls.length === 0) return null;

  // Try each stream URL, prefer one where we can parse the master playlist
  for (const streamUrl of streamUrls) {
    try {
      const m3u8Res = await fetch(streamUrl, {
        headers: {
          "User-Agent": UA,
          Referer: referer,
          Origin: "https://brightpathsignals.com",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!m3u8Res.ok) continue;
      const m3u8Body = await m3u8Res.text();
      if (!m3u8Body.trimStart().startsWith("#EXTM3U")) continue;

      if (m3u8Body.includes("#EXT-X-STREAM-INF:")) {
        return parseBestVariant(m3u8Body, streamUrl) ?? streamUrl;
      }
      return streamUrl;
    } catch {
      continue;
    }
  }

  return streamUrls[0] ?? null;
}

const streamImdbSource: VideoSource = {
  id: "streamimdb",
  name: "StreamIMDb",
  priority: 2,
  description: "Online streaming via StreamIMDb",

  async resolve(params: ResolveParams): Promise<PlayResponse | null> {
    const imdbId = await resolveImdbId(params);
    if (!imdbId) return null;

    const streamUrl = await fetchBestStreamUrl(
      imdbId,
      params.media_type,
      params.season,
      params.episode,
    );
    if (!streamUrl) return null;

    const referer = makeReferer(imdbId, params.media_type, params.season, params.episode);
    const encoded = encodeProxy(streamUrl, referer);

    return {
      type: "hls",
      master_manifest_url: `/api/hls-proxy?p=${encoded}`,
    };
  },
};

export default streamImdbSource;
