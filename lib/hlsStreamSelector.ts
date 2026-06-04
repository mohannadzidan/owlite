// simpleHlsStreamSelector.ts

import { parseMasterPlaylist, type HLSVariantStream } from "./hlsParser";

// ----------------------------------------------------------------------
// 1. User-Agent detection (simplified from original)
// ----------------------------------------------------------------------

type EngineKey = "chrome" | "edge" | "opera" | "samsung" | "firefox" | "safari";

type DetectedClient = {
  engineKey: EngineKey | null;
  version: number | null;
  resolvable: boolean;
  reason?: string;
};

function detectClient(userAgent: string): DetectedClient {
  const ua = (userAgent ?? "").trim();
  if (!ua) {
    return { engineKey: null, version: null, resolvable: false, reason: "empty UA" };
  }

  const matchers: Array<[RegExp, EngineKey]> = [
    [/Edg(?:A|iOS)?\/(\d+)/, "edge"],
    [/Edge\/(\d+)/, "edge"],
    [/(?:OPR|OPiOS|Opera)\/(\d+)/, "opera"],
    [/SamsungBrowser\/(\d+)/, "samsung"],
    [/(?:Firefox|FxiOS)\/(\d+)/, "firefox"],
    [/CriOS\/(\d+)/, "chrome"],
    [/(?:Chrome|Chromium)\/(\d+)/, "chrome"],
  ];

  let engineKey: EngineKey | null = null;
  let version: number | null = null;

  for (const [re, key] of matchers) {
    const match = ua.match(re);
    if (match) {
      engineKey = key;
      version = parseInt(match[1], 10);
      break;
    }
  }

  // Safari fallback
  if (
    !engineKey &&
    /Safari/.test(ua) &&
    /AppleWebKit/.test(ua) &&
    !/Chrome|Chromium|CriOS/.test(ua)
  ) {
    engineKey = "safari";
    const vMatch = ua.match(/Version\/(\d+)/);
    version = vMatch ? parseInt(vMatch[1], 10) : null;
  }

  const resolvable = engineKey !== null && version !== null && !isNaN(version);
  const reason = resolvable ? undefined : "could not determine browser or version";

  return { engineKey, version, resolvable, reason };
}

// ----------------------------------------------------------------------
// 2. Codec compatibility
// ----------------------------------------------------------------------

type CodecFamily =
  | "h264"
  | "hevc"
  | "vp9"
  | "vp8"
  | "av1"
  | "aac"
  | "mp3"
  | "ac3"
  | "eac3"
  | "opus"
  | "flac"
  | "vorbis";

type CodecSupportTable = Record<CodecFamily, Partial<Record<EngineKey, number>>>;

const DEFAULT_CODEC_TABLE: CodecSupportTable = {
  h264: { chrome: 4, edge: 12, opera: 15, samsung: 4, firefox: 21, safari: 4 },
  hevc: { chrome: 107, edge: 107, opera: 94, samsung: 21, firefox: 134, safari: 11 },
  vp9: { chrome: 29, edge: 79, opera: 16, samsung: 4, firefox: 28, safari: 14 },
  vp8: { chrome: 6, edge: 79, opera: 11, samsung: 4, firefox: 4 },
  av1: { chrome: 70, edge: 121, opera: 57, samsung: 12, firefox: 67, safari: 17 },
  aac: { chrome: 4, edge: 12, opera: 15, samsung: 4, firefox: 22, safari: 4 },
  mp3: { chrome: 4, edge: 12, opera: 15, samsung: 4, firefox: 22, safari: 4 },
  ac3: { safari: 11 },
  eac3: { safari: 11 },
  opus: { chrome: 33, edge: 79, opera: 20, samsung: 3, firefox: 15, safari: 11 },
  flac: { chrome: 56, edge: 79, opera: 43, samsung: 6, firefox: 51, safari: 11 },
  vorbis: { chrome: 4, edge: 79, opera: 11, samsung: 4, firefox: 4 },
};

function codecFamily(codec: string): CodecFamily | null {
  const c = codec.trim().toLowerCase();
  const fourcc = c.split(".")[0];
  switch (fourcc) {
    case "avc1":
    case "avc2":
    case "avc3":
      return "h264";
    case "hev1":
    case "hvc1":
    case "dvh1":
    case "dvhe":
      return "hevc";
    case "vp09":
    case "vp9":
      return "vp9";
    case "vp08":
    case "vp8":
      return "vp8";
    case "av01":
      return "av1";
    case "ac-3":
      return "ac3";
    case "ec-3":
      return "eac3";
    case "opus":
      return "opus";
    case "flac":
      return "flac";
    case "vorbis":
      return "vorbis";
    case "mp3":
      return "mp3";
    case "mp4a": {
      const oti = c.split(".")[1];
      if (oti === "69" || oti === "6b") return "mp3";
      return "aac";
    }
    default:
      return null;
  }
}

function isCodecSupported(
  codec: string,
  client: DetectedClient,
  table: CodecSupportTable,
): boolean {
  if (!client.resolvable) return true; // skip filter if detection failed
  const family = codecFamily(codec);
  if (!family) return true; // unknown codec: allow
  const minVer = table[family]?.[client.engineKey!];
  if (minVer === undefined) return false;
  return client.version! >= minVer;
}

// ----------------------------------------------------------------------
// 3. Helpers for variant filtering & height
// ----------------------------------------------------------------------

function variantHeight(v: HLSVariantStream): number | null {
  return v.resolution?.height ?? null;
}

function filterPlayableVariants(
  variants: HLSVariantStream[],
  client: DetectedClient,
  table: CodecSupportTable,
): HLSVariantStream[] {
  if (!client.resolvable) return [...variants]; // keep all
  return variants.filter((v) =>
    (v.codecs ?? []).every((codec) => isCodecSupported(codec, client, table)),
  );
}

function bestVariantForScreen(
  variants: HLSVariantStream[],
  screenHeight: number,
): HLSVariantStream | null {
  const withRes = variants.filter((v) => variantHeight(v) !== null);
  if (withRes.length === 0) return null;

  const atOrBelow = withRes.filter((v) => variantHeight(v)! <= screenHeight);
  if (atOrBelow.length > 0) {
    return atOrBelow.reduce((best, curr) =>
      variantHeight(curr)! > variantHeight(best)! ? curr : best,
    );
  }
  // all taller than screen → pick smallest height
  return withRes.reduce((best, curr) =>
    variantHeight(curr)! < variantHeight(best)! ? curr : best,
  );
}

function countAtOrBelow(variants: HLSVariantStream[], limitHeight: number): number {
  return variants.filter((v) => {
    const h = variantHeight(v);
    return h !== null && h <= limitHeight;
  }).length;
}

// ----------------------------------------------------------------------
// 4. Main selector
// ----------------------------------------------------------------------

export type ScoredStream = {
  url: string;
  totalScore: number;
};

export type SelectOptions = {
  m3u8Fetchers: ((signal: AbortSignal) => Promise<Response>)[];
  screenHeight: number;
  userAgent: string;
  timeoutMs?: number; // default 8000
  weights?: {
    time?: number; // default 40
    screen?: number; // default 30
    variants?: number; // default 30
  };
  fetchImpl?: typeof fetch; // default global fetch
  logger?: Pick<Console, "warn" | "debug">;
  codecSupportTable?: Partial<CodecSupportTable>;
};

export class NoStreamsError extends Error {
  constructor(public readonly dropped: string[]) {
    super("No streams available after filtering");
    this.name = "NoStreamsError";
  }
}

export async function selectBestStreams(options: SelectOptions): Promise<ScoredStream[]> {
  const {
    m3u8Fetchers,
    screenHeight,
    userAgent,
    timeoutMs = 8000,
    weights = {},
    logger = console,
    codecSupportTable,
  } = options;
  console.log("Selecting best stream from candidates:", {
    m3u8Fetchers: m3u8Fetchers.length,
    screenHeight,
    userAgent,
    timeoutMs,
    weights,
    logger,
    codecSupportTable,
  });
  if (!m3u8Fetchers.length) throw new NoStreamsError([]);
  if (screenHeight <= 0) throw new RangeError("screenHeight must be positive");

  const w = {
    time: weights.time ?? 40,
    screen: weights.screen ?? 30,
    variants: weights.variants ?? 30,
  };

  // Merge codec table
  const table: CodecSupportTable = { ...DEFAULT_CODEC_TABLE };
  if (codecSupportTable) {
    for (const family of Object.keys(codecSupportTable) as CodecFamily[]) {
      table[family] = { ...table[family], ...codecSupportTable[family] };
    }
  }

  const client = detectClient(userAgent);

  console.log("Detected client:", client);
  if (!client.resolvable) {
    logger.warn(`[HLS Selector] Skipping codec filter: ${client.reason}. UA: ${userAgent}`);
  }

  // Phase 1: fetch all concurrently, measure time, drop dead streams
  const fetchPromises = m3u8Fetchers.map(async (fetcher) => {
    const start = performance.now();
    // warm up fetcher if needed
    const resp = await fetcher(AbortSignal.timeout(timeoutMs));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const elapsed = performance.now() - start;

    const playlist = parseMasterPlaylist(text);
    return { url: resp.url, requestTimeMs: elapsed, playlist };
  });

  const settled = await Promise.allSettled(fetchPromises);
  const validStreams: Array<{
    url: string;
    requestTimeMs: number;
    playableVariants: HLSVariantStream[];
  }> = [];
  const droppedUrls: string[] = [];

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled") {
      const { url, requestTimeMs, playlist } = s.value;
      const playableVariants = filterPlayableVariants(playlist.variants, client, table);
      if (playableVariants.length === 0) {
        droppedUrls.push(url);
        logger.debug?.(`[HLS Selector] Dropped ${url}`);
      } else {
        validStreams.push({ url, requestTimeMs, playableVariants });
      }
    } else {
      droppedUrls.push("unresolved - " + String(s.reason));
    }
  }

  if (validStreams.length === 0) {
    throw new NoStreamsError(droppedUrls);
  }

  // Phase 2: compute averages
  const tAvg = validStreams.reduce((sum, s) => sum + s.requestTimeMs, 0) / validStreams.length;
  const vAvg =
    validStreams.reduce((sum, s) => {
      const count = countAtOrBelow(s.playableVariants, screenHeight);
      return sum + count;
    }, 0) / validStreams.length;

  // Phase 3: score each stream
  const scored: ScoredStream[] = validStreams.map((stream) => {
    // 3.1 Time score
    const rTime = tAvg > 0 ? stream.requestTimeMs / tAvg : 1;
    const timeScore = (2 - rTime) * w.time;

    // 3.2 Screen match score
    const chosen = bestVariantForScreen(stream.playableVariants, screenHeight);
    let screenScore = 0;
    if (chosen) {
      const hBest = variantHeight(chosen)!;
      const ratio = Math.min(screenHeight, hBest) / Math.max(screenHeight, hBest);
      screenScore = ratio * w.screen;
    }

    // 3.3 Variant richness score
    let variantScore = 0;
    if (chosen) {
      const vCount = countAtOrBelow(stream.playableVariants, variantHeight(chosen)!);
      const rVar = vAvg > 0 ? vCount / vAvg : 1;
      variantScore = rVar * w.variants;
    }

    const totalScore = timeScore + screenScore + variantScore;
    return { url: stream.url, totalScore };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored;
}
