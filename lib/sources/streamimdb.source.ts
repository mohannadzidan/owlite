import { movies, tv } from "@/services/tmdb.service";
import { streams } from "@/services/streamimdb.service";
import type { PlayResponse, ResolveParams, VideoSource } from "@/lib/types";
import { selectBestStreams } from "../hlsStreamSelector";

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

function encodeProxy(u: string, r: string): string {
  return Buffer.from(JSON.stringify({ u, r })).toString("base64url");
}

async function fetchBestStreamUrl(
  screenSize: number,
  userAgent: string,
  imdbId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
): Promise<{ url: string; fileName: string } | null> {
  let body;
  try {
    body = await streams.urls(imdbId, mediaType, season, episode);
  } catch {
    return null;
  }

  console.log("Vaplayer response", body);
  const streamUrls = body?.data?.stream_urls;
  if (!Array.isArray(streamUrls) || streamUrls.length === 0) return null;
  try {
    const scoredStreams = await selectBestStreams({
      m3u8Fetchers: streamUrls.map((url) =>
        streams.fetcher(url, imdbId, mediaType, season, episode),
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

    const referer = streams.referer(imdbId, params.media_type, params.season, params.episode);
    const encoded = encodeProxy(bestStream.url, referer);

    return {
      type: "hls",
      master_manifest_url: `/api/hls-proxy?p=${encoded}`,
      fileName: bestStream.fileName,
    };
  },
};

export default streamImdbSource;
