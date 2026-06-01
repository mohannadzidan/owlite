import { movies, tv } from "@/services/tmdb.service";
import type { PlayResponse, ResolveParams, VideoSource } from "@/lib/types";
import { selectBestStreams } from "../hlsStreamSelector";

const VAPLAYER_API_URL = process.env.VAPLAYER_API_URL ?? "https://streamdata.vaplayer.ru/api.php";
const BRIGHTPATH_BASE = "https://brightpathsignals.com/embed";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function resolveImdbId(params: ResolveParams): Promise<string | null> {
  if (params.imdb_id) return params.imdb_id;
  try {
    return params.media_type === "movie"
      ? await movies.imdbId(params.tmdb_id)
      : await tv.imdbId(params.tmdb_id);
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

function encodeProxy(u: string, r: string): string {
  return Buffer.from(JSON.stringify({ u, r })).toString("base64url");
}

interface VaplayerResponse {
  status?: number;
  data?: { stream_urls?: string[]; file_name?: string };
}

async function fetchBestStreamUrl(
  screenSize: number,
  userAgent: string,
  imdbId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
): Promise<{ url: string; fileName: string } | null> {
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
  console.log("Vaplayer response", apiUrl, body);
  console.log(body);
  const streamUrls = body?.data?.stream_urls;
  if (!Array.isArray(streamUrls) || streamUrls.length === 0) return null;
  try {
    const scoredStreams = await selectBestStreams({
      m3u8Fetchers: streamUrls.map(
        (url) => (signal) =>
          fetch(url, {
            headers: {
              "User-Agent": UA,
              Referer: referer,
              Origin: "https://brightpathsignals.com",
            },
            signal,
          }),
      ),
      screenHeight: screenSize,
      userAgent,
    });
    console.log("Scored streams", scoredStreams);
    return { url: scoredStreams[0].url, fileName: body.data!.file_name! };
  } catch (e) {
    console.error("Error selecting best stream", e);
    return null;
  }
}

const streamImdbSource: VideoSource = {
  id: "streamimdb",
  name: "StreamIMDb",
  priority: 2,
  description: "Online streaming via StreamIMDb",

  async resolve(params: ResolveParams): Promise<PlayResponse | null> {
    const imdbId = await resolveImdbId(params);
    if (!imdbId) return null;

    const bestStream = await fetchBestStreamUrl(
      params.screenSize,
      params.userAgent,
      imdbId,
      params.media_type,
      params.season,
      params.episode,
    );
    if (!bestStream) return null;

    const referer = makeReferer(imdbId, params.media_type, params.season, params.episode);
    const encoded = encodeProxy(bestStream.url, referer);

    return {
      type: "hls",
      master_manifest_url: `/api/hls-proxy?p=${encoded}`,
      fileName: bestStream.fileName,
    };
  },
};

export default streamImdbSource;
