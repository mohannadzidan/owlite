/**
 * HLS Master Playlist Parser
 * Fully typed, robust parser for HLS (HTTP Live Streaming) Master Playlists
 * Compliant with RFC 8216 / Apple HLS specification
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type HLSEncryptionMethod = "NONE" | "AES-128" | "SAMPLE-AES";
export type HLSMediaType = "AUDIO" | "VIDEO" | "SUBTITLES" | "CLOSED-CAPTIONS";
export type HLSHDCPLevel = "NONE" | "TYPE-0" | "TYPE-1";
export type HLSVideoRange = "SDR" | "HLG" | "PQ";

export interface HLSResolution {
  width: number;
  height: number;
}

/**
 * Represents an EXT-X-MEDIA tag (alternative rendition)
 */
export interface HLSMediaRendition {
  type: HLSMediaType;
  groupId: string;
  language?: string;
  assocLanguage?: string;
  name: string;
  default: boolean;
  autoselect: boolean;
  forced: boolean;
  instreamId?: string;
  characteristics?: string[];
  channels?: string;
  uri?: string;
}

/**
 * Represents an EXT-X-STREAM-INF tag (variant stream)
 */
export interface HLSVariantStream {
  uri: string;
  bandwidth: number;
  averageBandwidth?: number;
  codecs?: string[];
  resolution?: HLSResolution;
  frameRate?: number;
  hdcpLevel?: HLSHDCPLevel;
  allowedCpc?: HLSAllowedCpc[];
  videoRange?: HLSVideoRange;
  audio?: string;
  video?: string;
  subtitles?: string;
  closedCaptions?: string;
  programId?: number; // deprecated but still seen
}

/**
 * Represents an EXT-X-I-FRAME-STREAM-INF tag
 */
export interface HLSIFrameStream {
  uri: string;
  bandwidth: number;
  averageBandwidth?: number;
  codecs?: string[];
  resolution?: HLSResolution;
  hdcpLevel?: HLSHDCPLevel;
  videoRange?: HLSVideoRange;
  video?: string;
  programId?: number;
}

/**
 * Represents an EXT-X-SESSION-DATA tag
 */
export interface HLSSessionData {
  dataId: string;
  value?: string;
  uri?: string;
  language?: string;
}

/**
 * Represents an EXT-X-SESSION-KEY tag
 */
export interface HLSSessionKey {
  method: HLSEncryptionMethod;
  uri?: string;
  iv?: string;
  keyFormat?: string;
  keyFormatVersions?: number[];
}

/**
 * Represents an EXT-X-START tag
 */
export interface HLSStartPoint {
  timeOffset: number;
  precise: boolean;
}

/**
 * Represents allowed CPC (Content Protection Configuration) entry
 */
export interface HLSAllowedCpc {
  keySystem: string;
  cpcLabels: string[];
}

/**
 * Top-level result of parsing a master playlist
 */
export interface HLSMasterPlaylist {
  /** HLS protocol version (EXT-X-VERSION) */
  version?: number;
  /** Whether independent segments are declared */
  independentSegments: boolean;
  /** All variant streams (EXT-X-STREAM-INF) */
  variants: HLSVariantStream[];
  /** All I-frame streams (EXT-X-I-FRAME-STREAM-INF) */
  iFrameStreams: HLSIFrameStream[];
  /** All media renditions (EXT-X-MEDIA) */
  mediaRenditions: HLSMediaRendition[];
  /** Session data entries (EXT-X-SESSION-DATA) */
  sessionData: HLSSessionData[];
  /** Session-level DRM keys (EXT-X-SESSION-KEY) */
  sessionKeys: HLSSessionKey[];
  /** Playlist start point (EXT-X-START) */
  start?: HLSStartPoint;
  /** Raw lines that were not recognized */
  unknownTags: string[];
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class HLSParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly rawLine: string,
  ) {
    super(`[HLS Parse Error] Line ${line}: ${message}\n  → "${rawLine}"`);
    this.name = "HLSParseError";
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Parses a quoted-string or unquoted attribute value from an HLS attribute list.
 * Handles: KEY="value", KEY=value, KEY=123
 */
function parseAttributeList(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Regex matches: KEY="quoted value" or KEY=unquoted-value
  const re = /([A-Z0-9_-]+)=(?:"([^"]*)"|([^,]*))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
    attrs[key] = value.trim();
  }
  return attrs;
}

function parseResolution(value: string): HLSResolution | undefined {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) return undefined;
  return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
}

function parseFrameRate(value: string): number | undefined {
  const n = parseFloat(value);
  return isNaN(n) ? undefined : n;
}

function parseBoolean(value: string): boolean {
  return value.toUpperCase() === "YES";
}

function parseCodecs(value: string): string[] {
  return value
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

function parseKeyFormatVersions(value: string): number[] {
  return value
    .split("/")
    .map(Number)
    .filter((n) => !isNaN(n));
}

function parseAllowedCpc(value: string): HLSAllowedCpc[] {
  return value.split(",").map((entry) => {
    const [keySystem, ...labels] = entry.trim().split(":");
    return { keySystem: keySystem.trim(), cpcLabels: labels };
  });
}

function parseCharacteristics(value: string): string[] {
  return value
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

function resolveUri(uri: string, baseUri?: string): string {
  if (!baseUri || uri.match(/^https?:\/\//)) return uri;
  try {
    return new URL(uri, baseUri).href;
  } catch {
    // If URL parsing fails (e.g. Node without global URL), return as-is
    const base = baseUri.replace(/[^/]*$/, "");
    return uri.startsWith("/") ? uri : `${base}${uri}`;
  }
}

// ─── Tag parsers ──────────────────────────────────────────────────────────────

function parseStreamInf(attrs: Record<string, string>, uri: string): HLSVariantStream {
  return {
    uri,
    bandwidth: parseInt(attrs["BANDWIDTH"] ?? "0", 10),
    averageBandwidth: attrs["AVERAGE-BANDWIDTH"]
      ? parseInt(attrs["AVERAGE-BANDWIDTH"], 10)
      : undefined,
    codecs: attrs["CODECS"] ? parseCodecs(attrs["CODECS"]) : undefined,
    resolution: attrs["RESOLUTION"] ? parseResolution(attrs["RESOLUTION"]) : undefined,
    frameRate: attrs["FRAME-RATE"] ? parseFrameRate(attrs["FRAME-RATE"]) : undefined,
    hdcpLevel: attrs["HDCP-LEVEL"] as HLSHDCPLevel | undefined,
    allowedCpc: attrs["ALLOWED-CPC"] ? parseAllowedCpc(attrs["ALLOWED-CPC"]) : undefined,
    videoRange: attrs["VIDEO-RANGE"] as HLSVideoRange | undefined,
    audio: attrs["AUDIO"],
    video: attrs["VIDEO"],
    subtitles: attrs["SUBTITLES"],
    closedCaptions: attrs["CLOSED-CAPTIONS"] === "NONE" ? undefined : attrs["CLOSED-CAPTIONS"],
    programId: attrs["PROGRAM-ID"] ? parseInt(attrs["PROGRAM-ID"], 10) : undefined,
  };
}

function parseIFrameStreamInf(attrs: Record<string, string>): HLSIFrameStream {
  return {
    uri: attrs["URI"] ?? "",
    bandwidth: parseInt(attrs["BANDWIDTH"] ?? "0", 10),
    averageBandwidth: attrs["AVERAGE-BANDWIDTH"]
      ? parseInt(attrs["AVERAGE-BANDWIDTH"], 10)
      : undefined,
    codecs: attrs["CODECS"] ? parseCodecs(attrs["CODECS"]) : undefined,
    resolution: attrs["RESOLUTION"] ? parseResolution(attrs["RESOLUTION"]) : undefined,
    hdcpLevel: attrs["HDCP-LEVEL"] as HLSHDCPLevel | undefined,
    videoRange: attrs["VIDEO-RANGE"] as HLSVideoRange | undefined,
    video: attrs["VIDEO"],
    programId: attrs["PROGRAM-ID"] ? parseInt(attrs["PROGRAM-ID"], 10) : undefined,
  };
}

function parseMedia(attrs: Record<string, string>): HLSMediaRendition {
  return {
    type: attrs["TYPE"] as HLSMediaType,
    groupId: attrs["GROUP-ID"] ?? "",
    language: attrs["LANGUAGE"],
    assocLanguage: attrs["ASSOC-LANGUAGE"],
    name: attrs["NAME"] ?? "",
    default: parseBoolean(attrs["DEFAULT"] ?? "NO"),
    autoselect: parseBoolean(attrs["AUTOSELECT"] ?? "NO"),
    forced: parseBoolean(attrs["FORCED"] ?? "NO"),
    instreamId: attrs["INSTREAM-ID"],
    characteristics: attrs["CHARACTERISTICS"]
      ? parseCharacteristics(attrs["CHARACTERISTICS"])
      : undefined,
    channels: attrs["CHANNELS"],
    uri: attrs["URI"],
  };
}

function parseSessionData(attrs: Record<string, string>): HLSSessionData {
  return {
    dataId: attrs["DATA-ID"] ?? "",
    value: attrs["VALUE"],
    uri: attrs["URI"],
    language: attrs["LANGUAGE"],
  };
}

function parseSessionKey(attrs: Record<string, string>): HLSSessionKey {
  return {
    method: (attrs["METHOD"] as HLSEncryptionMethod) ?? "NONE",
    uri: attrs["URI"],
    iv: attrs["IV"],
    keyFormat: attrs["KEYFORMAT"],
    keyFormatVersions: attrs["KEYFORMATVERSIONS"]
      ? parseKeyFormatVersions(attrs["KEYFORMATVERSIONS"])
      : undefined,
  };
}

function parseStart(attrs: Record<string, string>): HLSStartPoint {
  return {
    timeOffset: parseFloat(attrs["TIME-OFFSET"] ?? "0"),
    precise: parseBoolean(attrs["PRECISE"] ?? "NO"),
  };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export interface HLSParserOptions {
  /** Base URI used to resolve relative URIs in the playlist */
  baseUri?: string;
  /** If true, throw HLSParseError on malformed lines; otherwise collect unknownTags */
  strict?: boolean;
}

/**
 * Parses an HLS Master Playlist string into a structured {@link HLSMasterPlaylist} object.
 *
 * @param content  Raw playlist text (e.g. fetched via HTTP or read from disk)
 * @param options  Optional parser configuration
 * @returns        Parsed master playlist
 * @throws         {@link HLSParseError} if the playlist is not a valid master playlist
 *                 header, or when `strict` mode is enabled and a line is malformed.
 *
 * @example
 * ```ts
 * const playlist = parseMasterPlaylist(rawText, { baseUri: "https://cdn.example.com/hls/" });
 * for (const variant of playlist.variants) {
 *   console.log(variant.bandwidth, variant.resolution, variant.uri);
 * }
 * ```
 */
export function parseMasterPlaylist(
  content: string,
  options: HLSParserOptions = {},
): HLSMasterPlaylist {
  const { baseUri, strict = false } = options;

  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  if (lines[0].trim() !== "#EXTM3U") {
    throw new HLSParseError("Playlist must start with #EXTM3U", 1, lines[0] ?? "");
  }

  const result: HLSMasterPlaylist = {
    independentSegments: false,
    variants: [],
    iFrameStreams: [],
    mediaRenditions: [],
    sessionData: [],
    sessionKeys: [],
    unknownTags: [],
  };

  let pendingStreamInf: Record<string, string> | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // Skip empty lines and comments that aren't tags
    if (!line || (line.startsWith("#") && !line.startsWith("#EXT"))) {
      // If we have a pending stream-inf and hit a blank/comment, clear it
      if (!line && pendingStreamInf) pendingStreamInf = null;
      continue;
    }

    // ── URI line (follows EXT-X-STREAM-INF) ───────────────────────────────
    if (!line.startsWith("#")) {
      if (pendingStreamInf) {
        const uri = resolveUri(line, baseUri);
        result.variants.push(parseStreamInf(pendingStreamInf, uri));
        pendingStreamInf = null;
      } else {
        // Unexpected URI outside of a stream-inf context
        if (strict) {
          throw new HLSParseError(
            "Unexpected URI line outside EXT-X-STREAM-INF context",
            lineNumber,
            line,
          );
        }
        result.unknownTags.push(line);
      }
      continue;
    }

    // ── Tag lines ──────────────────────────────────────────────────────────
    const colonIdx = line.indexOf(":");
    const tagName = colonIdx === -1 ? line : line.slice(0, colonIdx);
    const tagValue = colonIdx === -1 ? "" : line.slice(colonIdx + 1);

    try {
      switch (tagName) {
        case "#EXTM3U":
          // Already handled; ignore if repeated
          break;

        case "#EXT-X-VERSION":
          result.version = parseInt(tagValue, 10);
          break;

        case "#EXT-X-INDEPENDENT-SEGMENTS":
          result.independentSegments = true;
          break;

        case "#EXT-X-START": {
          const attrs = parseAttributeList(tagValue);
          result.start = parseStart(attrs);
          break;
        }

        case "#EXT-X-MEDIA": {
          const attrs = parseAttributeList(tagValue);
          const rendition = parseMedia(attrs);
          if (rendition.uri) {
            rendition.uri = resolveUri(rendition.uri, baseUri);
          }
          result.mediaRenditions.push(rendition);
          break;
        }

        case "#EXT-X-STREAM-INF": {
          pendingStreamInf = parseAttributeList(tagValue);
          break;
        }

        case "#EXT-X-I-FRAME-STREAM-INF": {
          const attrs = parseAttributeList(tagValue);
          const stream = parseIFrameStreamInf(attrs);
          stream.uri = resolveUri(stream.uri, baseUri);
          result.iFrameStreams.push(stream);
          break;
        }

        case "#EXT-X-SESSION-DATA": {
          const attrs = parseAttributeList(tagValue);
          const sd = parseSessionData(attrs);
          if (sd.uri) sd.uri = resolveUri(sd.uri, baseUri);
          result.sessionData.push(sd);
          break;
        }

        case "#EXT-X-SESSION-KEY": {
          const attrs = parseAttributeList(tagValue);
          const sk = parseSessionKey(attrs);
          if (sk.uri) sk.uri = resolveUri(sk.uri, baseUri);
          result.sessionKeys.push(sk);
          break;
        }

        // These tags belong to media playlists — flag them in a master playlist
        case "#EXT-X-TARGETDURATION":
        case "#EXT-X-MEDIA-SEQUENCE":
        case "#EXT-X-DISCONTINUITY-SEQUENCE":
        case "#EXT-X-ENDLIST":
        case "#EXT-X-PLAYLIST-TYPE":
        case "#EXTINF":
        case "#EXT-X-KEY":
        case "#EXT-X-MAP":
        case "#EXT-X-PROGRAM-DATE-TIME":
          if (strict) {
            throw new HLSParseError(
              `Tag "${tagName}" is only valid in a media playlist, not a master playlist`,
              lineNumber,
              line,
            );
          }
          result.unknownTags.push(line);
          break;

        default:
          result.unknownTags.push(line);
          break;
      }
    } catch (err) {
      if (err instanceof HLSParseError) throw err;
      if (strict) {
        throw new HLSParseError(`Failed to parse tag: ${(err as Error).message}`, lineNumber, line);
      }
      result.unknownTags.push(line);
    }
  }

  return result;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Returns variants sorted by bandwidth (ascending by default).
 */
export function sortVariantsByBandwidth(
  variants: HLSVariantStream[],
  order: "asc" | "desc" = "asc",
): HLSVariantStream[] {
  return [...variants].sort((a, b) =>
    order === "asc" ? a.bandwidth - b.bandwidth : b.bandwidth - a.bandwidth,
  );
}

/**
 * Returns the variant best matching a target bandwidth (closest without exceeding).
 * Falls back to the lowest available if all exceed the target.
 */
export function selectVariantByBandwidth(
  variants: HLSVariantStream[],
  targetBps: number,
): HLSVariantStream | undefined {
  if (variants.length === 0) return undefined;
  const sorted = sortVariantsByBandwidth(variants, "desc");
  return sorted.find((v) => v.bandwidth <= targetBps) ?? sorted[sorted.length - 1];
}

/**
 * Returns variants matching the given resolution exactly.
 */
export function filterVariantsByResolution(
  variants: HLSVariantStream[],
  width: number,
  height: number,
): HLSVariantStream[] {
  return variants.filter((v) => v.resolution?.width === width && v.resolution?.height === height);
}

/**
 * Returns all media renditions belonging to a specific group and type.
 */
export function getRenditionsByGroup(
  renditions: HLSMediaRendition[],
  groupId: string,
  type?: HLSMediaType,
): HLSMediaRendition[] {
  return renditions.filter((r) => r.groupId === groupId && (type === undefined || r.type === type));
}

/**
 * Returns a summary of unique resolutions available in the playlist.
 */
export function getAvailableResolutions(variants: HLSVariantStream[]): HLSResolution[] {
  const seen = new Set<string>();
  const result: HLSResolution[] = [];
  for (const v of variants) {
    if (!v.resolution) continue;
    const key = `${v.resolution.width}x${v.resolution.height}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(v.resolution);
    }
  }
  return result;
}

/**
 * Returns true if the playlist contains DRM-protected content.
 */
export function isDrmProtected(playlist: HLSMasterPlaylist): boolean {
  return (
    playlist.sessionKeys.some((k) => k.method !== "NONE") ||
    playlist.variants.some((v) =>
      playlist.mediaRenditions.some((r) => r.groupId === v.audio && r.uri !== undefined),
    )
  );
}

/**
 * Serialises a parsed master playlist back into valid HLS text.
 * Useful for programmatic playlist manipulation.
 */
export function serializeMasterPlaylist(playlist: HLSMasterPlaylist): string {
  const lines: string[] = ["#EXTM3U"];

  if (playlist.version !== undefined) {
    lines.push(`#EXT-X-VERSION:${playlist.version}`);
  }
  if (playlist.independentSegments) {
    lines.push("#EXT-X-INDEPENDENT-SEGMENTS");
  }
  if (playlist.start) {
    lines.push(
      `#EXT-X-START:TIME-OFFSET=${playlist.start.timeOffset}${playlist.start.precise ? ",PRECISE=YES" : ""}`,
    );
  }

  for (const key of playlist.sessionKeys) {
    const parts = [`METHOD=${key.method}`];
    if (key.uri) parts.push(`URI="${key.uri}"`);
    if (key.iv) parts.push(`IV=${key.iv}`);
    if (key.keyFormat) parts.push(`KEYFORMAT="${key.keyFormat}"`);
    if (key.keyFormatVersions) parts.push(`KEYFORMATVERSIONS="${key.keyFormatVersions.join("/")}"`);
    lines.push(`#EXT-X-SESSION-KEY:${parts.join(",")}`);
  }

  for (const sd of playlist.sessionData) {
    const parts = [`DATA-ID="${sd.dataId}"`];
    if (sd.value !== undefined) parts.push(`VALUE="${sd.value}"`);
    if (sd.uri) parts.push(`URI="${sd.uri}"`);
    if (sd.language) parts.push(`LANGUAGE="${sd.language}"`);
    lines.push(`#EXT-X-SESSION-DATA:${parts.join(",")}`);
  }

  for (const r of playlist.mediaRenditions) {
    const parts = [`TYPE=${r.type}`, `GROUP-ID="${r.groupId}"`, `NAME="${r.name}"`];
    if (r.language) parts.push(`LANGUAGE="${r.language}"`);
    if (r.assocLanguage) parts.push(`ASSOC-LANGUAGE="${r.assocLanguage}"`);
    parts.push(`DEFAULT=${r.default ? "YES" : "NO"}`);
    parts.push(`AUTOSELECT=${r.autoselect ? "YES" : "NO"}`);
    if (r.forced) parts.push("FORCED=YES");
    if (r.instreamId) parts.push(`INSTREAM-ID="${r.instreamId}"`);
    if (r.characteristics) parts.push(`CHARACTERISTICS="${r.characteristics.join(",")}"`);
    if (r.channels) parts.push(`CHANNELS="${r.channels}"`);
    if (r.uri) parts.push(`URI="${r.uri}"`);
    lines.push(`#EXT-X-MEDIA:${parts.join(",")}`);
  }

  for (const v of playlist.variants) {
    const parts = [`BANDWIDTH=${v.bandwidth}`];
    if (v.averageBandwidth) parts.push(`AVERAGE-BANDWIDTH=${v.averageBandwidth}`);
    if (v.codecs) parts.push(`CODECS="${v.codecs.join(",")}"`);
    if (v.resolution) parts.push(`RESOLUTION=${v.resolution.width}x${v.resolution.height}`);
    if (v.frameRate !== undefined) parts.push(`FRAME-RATE=${v.frameRate.toFixed(3)}`);
    if (v.hdcpLevel) parts.push(`HDCP-LEVEL=${v.hdcpLevel}`);
    if (v.videoRange) parts.push(`VIDEO-RANGE=${v.videoRange}`);
    if (v.audio) parts.push(`AUDIO="${v.audio}"`);
    if (v.video) parts.push(`VIDEO="${v.video}"`);
    if (v.subtitles) parts.push(`SUBTITLES="${v.subtitles}"`);
    if (v.closedCaptions) parts.push(`CLOSED-CAPTIONS="${v.closedCaptions}"`);
    lines.push(`#EXT-X-STREAM-INF:${parts.join(",")}`);
    lines.push(v.uri);
  }

  for (const f of playlist.iFrameStreams) {
    const parts = [`BANDWIDTH=${f.bandwidth}`, `URI="${f.uri}"`];
    if (f.averageBandwidth) parts.push(`AVERAGE-BANDWIDTH=${f.averageBandwidth}`);
    if (f.codecs) parts.push(`CODECS="${f.codecs.join(",")}"`);
    if (f.resolution) parts.push(`RESOLUTION=${f.resolution.width}x${f.resolution.height}`);
    if (f.hdcpLevel) parts.push(`HDCP-LEVEL=${f.hdcpLevel}`);
    if (f.videoRange) parts.push(`VIDEO-RANGE=${f.videoRange}`);
    if (f.video) parts.push(`VIDEO="${f.video}"`);
    lines.push(`#EXT-X-I-FRAME-STREAM-INF:${parts.join(",")}`);
  }

  return lines.join("\n") + "\n";
}
