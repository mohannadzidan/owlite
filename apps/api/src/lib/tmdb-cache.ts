import Keyv from "keyv";
import KeyvSqlite from "@keyv/sqlite";
import { mkdirSync } from "fs";
import path from "path";

const CACHE_DB_PATH =
  process.env.TMDB_API_CACHE_PATH || path.join(process.cwd(), "cache", "tmdb-api", "cache.sqlite");

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

mkdirSync(path.dirname(CACHE_DB_PATH), { recursive: true });

const cache = new Keyv<StoredResponse>({
  store: new KeyvSqlite(`sqlite://${CACHE_DB_PATH}`),
  ttl: DEFAULT_TTL_MS,
});

type StoredResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export type CachedResponse = StoredResponse & { fromCache: boolean };

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

export async function cachedFetch(url: string, authHeader: string): Promise<CachedResponse> {
  const cached = await cache.get(url);
  if (cached) return { ...cached, fromCache: true };

  const res = await fetch(url, {
    headers: { Authorization: authHeader, Accept: "application/json" },
  });

  const body = await res.text();
  const headersMap: Record<string, string> = {};
  res.headers.forEach((value, name) => {
    headersMap[name] = value;
  });

  const stored: StoredResponse = { status: res.status, headers: headersMap, body };

  if (res.ok) {
    const ttl = ttlFromHeaders(res.headers);
    if (ttl !== null) {
      await cache.set(url, stored, ttl).catch(() => {
        // Cache write failure is non-fatal
      });
    }
  }

  return { ...stored, fromCache: false };
}

export async function cachedTmdbGet<T>(url: string, authHeader: string): Promise<T> {
  const { status, body } = await cachedFetch(url, authHeader);
  if (status < 200 || status >= 300) throw new Error(`TMDB ${url} → ${status}`);
  return JSON.parse(body) as T;
}
