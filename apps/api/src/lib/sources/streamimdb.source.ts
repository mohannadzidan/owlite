import { streams } from "../../services/streamimdb.service";
import type { PlayResponse, ResolveParams, VideoSource } from "@owlite/types";
import { selectBestStreams } from "../hlsStreamSelector";

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
    const result = await streams.urls(imdbId, mediaType, season, episode);
    if ("error" in result) {
      console.error("[streamimdb] Error fetching stream URLs:", result);
      return null;
    }
    body = result;
  } catch (error) {
    console.error(
      "Error fetching stream URLs for imdb id:",
      imdbId,
      "media type:",
      mediaType,
      error,
    );
    return null;
  }

  const streamUrls = body?.data?.stream_urls;

  if (!Array.isArray(streamUrls) || streamUrls.length === 0) {
    console.warn(
      "No stream URLs found for imdb id:",
      imdbId,
      "media type:",
      mediaType,
      "season:",
      season,
      "episode:",
      episode,
    );
    return null;
  }
  try {
    const scoredStreams = await selectBestStreams({
      m3u8Fetchers: streamUrls.map((url) =>
        streams.fetcher(url, imdbId, mediaType, season, episode),
      ),
      screenHeight: screenSize,
      userAgent,
    });
    return { url: scoredStreams[0].url, fileName: body.data!.file_name! };
  } catch (e) {
    console.error("Error selecting best stream", e);
    return { url: streamUrls.at(-1)!, fileName: body.data!.file_name! };
  }
}

const streamImdbSource: VideoSource = {
  id: "streamimdb",
  name: "StreamIMDb",
  priority: 2,
  description: "Online streaming via StreamIMDb",

  async resolve(params: ResolveParams): Promise<PlayResponse | null> {
    const imdbId = params.imdb_id;

    const bestStream = await fetchBestStreamUrl(
      params.screenSize,
      params.userAgent,
      imdbId,
      params.media_type,
      params.season,
      params.episode,
    );
    if (!bestStream) {
      console.warn(
        "[streamimdb] Could not resolve stream for imdb id:",
        imdbId,
        "media type:",
        params.media_type,
      );
      return null;
    }

    const referer = streams.referer(imdbId, params.media_type, params.season, params.episode);
    const encoded = encodeProxy(bestStream.url, referer);

    return {
      type: "hls",
      master_manifest_url: `/api/hls-proxy?p=${encoded}`,
      fileName: bestStream.fileName?.split("/").pop(),
    };
  },

  async has(params) {
    const imdbId = params.imdb_id;
    if (!imdbId) return false;
    try {
      const result = await streams.urls(imdbId, params.media_type, params.season, params.episode);
      if ("error" in result) return false;
      return Array.isArray(result.data?.stream_urls) && (result.data?.stream_urls?.length ?? 0) > 0;
    } catch {
      return false;
    }
  },
};

export default streamImdbSource;
