import { createHash } from "crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "cache", "tmdb");
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

mkdirSync(CACHE_DIR, { recursive: true });

type CacheEntry = {
  expiresAt: number;
  status: number;
  headers: Record<string, string>;
  body: string;
};

function cacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

function readEntry(key: string): CacheEntry | null {
  try {
    return JSON.parse(readFileSync(cachePath(key), "utf8")) as CacheEntry;
  } catch {
    return null;
  }
}

function writeEntry(key: string, entry: CacheEntry): void {
  try {
    writeFileSync(cachePath(key), JSON.stringify(entry), "utf8");
  } catch {
    // Cache write failure is non-fatal
  }
}

function ttlFromHeaders(headers: Headers): number | null {
  const cc = headers.get("cache-control");
  if (cc) {
    const match = /max-age=(\d+)/.exec(cc);
    if (match) return parseInt(match[1], 10) * 1000;
    if (cc.includes("no-store") || cc.includes("no-cache")) return null;
  }
  const expires = headers.get("expires");
  if (expires) {
    const ms = new Date(expires).getTime() - Date.now();
    if (ms > 0) return ms;
  }
  return DEFAULT_TTL_MS;
}

export type CachedResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export async function cachedFetch(url: string, authHeader: string): Promise<CachedResponse> {
  const key = cacheKey(url);
  const entry = readEntry(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { status: entry.status, headers: entry.headers, body: entry.body };
  }

  const res = await fetch(url, {
    headers: { Authorization: authHeader, Accept: "application/json" },
  });

  const body = await res.text();

  if (res.ok) {
    const headersToCache: Record<string, string> = {};
    res.headers.forEach((value, name) => {
      headersToCache[name] = value;
    });
    const ttl = ttlFromHeaders(res.headers);
    if (ttl !== null) {
      writeEntry(key, {
        expiresAt: Date.now() + ttl,
        status: res.status,
        headers: headersToCache,
        body,
      });
    }
  }

  const headers: Record<string, string> = {};
  res.headers.forEach((value, name) => {
    headers[name] = value;
  });
  return { status: res.status, headers, body };
}

function cleanupExpiredEntries(): void {
  let removed = 0;
  try {
    const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      try {
        const entry = JSON.parse(readFileSync(filePath, "utf8")) as CacheEntry;
        if (entry.expiresAt <= Date.now()) {
          rmSync(filePath);
          removed++;
        }
      } catch {
        // Unreadable/corrupt file — delete it
        try { rmSync(filePath); removed++; } catch { /* ignore */ }
      }
    }
  } catch {
    // CACHE_DIR not readable — nothing to clean
  }
  if (removed > 0) console.log(`[tmdb-cache] Removed ${removed} expired entries`);
}

export function scheduleTmdbCacheCleanup(): void {
  cleanupExpiredEntries();
  setInterval(cleanupExpiredEntries, 5 * 60 * 60 * 1000).unref();
}

export async function cachedTmdbGet<T>(url: string, authHeader: string): Promise<T> {
  const { status, body } = await cachedFetch(url, authHeader);
  if (status < 200 || status >= 300) throw new Error(`TMDB ${url} → ${status}`);
  return JSON.parse(body) as T;
}
