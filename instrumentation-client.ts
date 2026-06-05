import "core-js/stable";
// polyfills.js

if (typeof window !== "undefined" && typeof WeakRef === "undefined") {
  globalThis.WeakRef = class WeakRef {
    _target: unknown;
    constructor(target: unknown) {
      this._target = target;
    }
    deref() {
      return this._target;
    }
  } as unknown as WeakRefConstructor;
}
import {
  CLIENT_ERROR_ENDPOINT,
  CLIENT_LOG_ENDPOINT,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  type ClientLogPayload,
  type ClientErrorEventType,
  type ClientErrorPayload,
  type ConsoleMethodName,
} from "@/lib/observability";
import { shortcutsStore } from "./lib/shortcuts/store";
import { SHORTCUTS } from "./lib/constants/shortcuts";
import { installShortcuts } from "./lib/shortcuts";
import { loadBindings, saveBindings } from "./lib/shortcuts-storage";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${name}=`;
  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));

  if (!found) return null;

  return decodeURIComponent(found.slice(prefix.length));
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "path=/",
    `max-age=${maxAgeSeconds}`,
    "samesite=lax",
    secure ? "secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

function stringifyReason(reason: unknown): string {
  if (typeof reason === "string") return reason;

  if (reason instanceof Error) return reason.message || "Unknown error";

  try {
    return JSON.stringify(reason);
  } catch {
    return "Unhandled promise rejection";
  }
}

function stringifyConsoleArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  if (value instanceof Error) {
    return JSON.stringify({ name: value.name, message: value.message, stack: value.stack });
  }

  const seen = new WeakSet<object>();

  const replacer = (_key: string, nestedValue: unknown): unknown => {
    if (typeof nestedValue === "bigint") return `${nestedValue}n`;
    if (typeof nestedValue === "symbol") return nestedValue.toString();
    if (typeof nestedValue === "function") return `[Function ${nestedValue.name || "anonymous"}]`;
    if (nestedValue instanceof Error) {
      return {
        name: nestedValue.name,
        message: nestedValue.message,
        stack: nestedValue.stack,
      };
    }
    if (nestedValue && typeof nestedValue === "object") {
      if (seen.has(nestedValue)) return "[Circular]";
      seen.add(nestedValue);
    }

    return nestedValue;
  };

  try {
    return JSON.stringify(value, replacer) ?? String(value);
  } catch {
    return String(value);
  }
}

function getOrCreateSessionId(): string {
  const existing = getCookie(SESSION_COOKIE_NAME);
  if (existing) return existing;

  const sessionId = generateSessionId();
  setCookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_MAX_AGE);
  return sessionId;
}

function sendClientError(payload: ClientErrorPayload) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(CLIENT_ERROR_ENDPOINT, blob)) return;
  }

  // void fetch(CLIENT_ERROR_ENDPOINT, {
  //   method: "POST",
  //   headers: { "content-type": "application/json" },
  //   body,
  //   keepalive: true,
  // }).catch(() => {});
}

function sendClientLog(payload: ClientLogPayload) {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(CLIENT_LOG_ENDPOINT, blob)) return;
  }

  // void fetch(CLIENT_LOG_ENDPOINT, {
  //   method: "POST",
  //   headers: { "content-type": "application/json" },
  //   body,
  //   keepalive: true,
  // }).catch(() => {});
}

function serializeError(
  type: ClientErrorEventType,
  error: Error | string,
  extra: Pick<ClientErrorPayload, "filename" | "lineno" | "colno"> = {},
): ClientErrorPayload {
  const sessionId = getOrCreateSessionId();
  const message = typeof error === "string" ? error : error.message || "Unknown error";
  const stack = typeof error === "string" ? undefined : error.stack;

  return {
    sessionId,
    type,
    message,
    stack,
    filename: extra.filename,
    lineno: extra.lineno,
    colno: extra.colno,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };
}

function serializeConsoleLog(method: ConsoleMethodName, args: unknown[]): ClientLogPayload {
  const sessionId = getOrCreateSessionId();

  return {
    sessionId,
    method,
    args: args.map((arg) => stringifyConsoleArg(arg)),
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };
}

function patchConsoleMethods() {
  const consoleObject = console as unknown as Record<string, (...args: unknown[]) => unknown> & {
    __owliteConsolePatched__?: boolean;
  };
  if (consoleObject.__owliteConsolePatched__) return;
  consoleObject.__owliteConsolePatched__ = true;

  const methodNames = Object.getOwnPropertyNames(consoleObject)
    .filter((name): name is ConsoleMethodName => {
      return typeof consoleObject[name as keyof Console] === "function";
    })
    .filter((a) => a === "error" || a === "warn" || a === "info"); // --- IGNORE ---

  for (const methodName of methodNames) {
    const original = consoleObject[methodName];
    if (typeof original !== "function") continue;

    consoleObject[methodName] = ((...args: unknown[]) => {
      try {
        sendClientLog(serializeConsoleLog(methodName, args));
      } catch {
        // Intentionally swallow instrumentation failures.
      }

      return Reflect.apply(original, consoleObject, args);
    }) as (...args: unknown[]) => unknown;
  }
}

function handleError(event: ErrorEvent) {
  try {
    const error = event.error instanceof Error ? event.error : event.message || "Unknown error";
    sendClientError(
      serializeError("error", error, {
        filename: event.filename || undefined,
        lineno: event.lineno || undefined,
        colno: event.colno || undefined,
      }),
    );
  } catch {
    // Intentionally swallow instrumentation failures.
  }
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  try {
    const reason = event.reason;
    const error = reason instanceof Error ? reason : new Error(stringifyReason(reason));

    sendClientError(serializeError("unhandledrejection", error));
  } catch {
    // Intentionally swallow instrumentation failures.
  }
}

try {
  if (typeof window !== "undefined") {
    getOrCreateSessionId();
    patchConsoleMethods();
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
  }
} catch {
  // Intentionally swallow instrumentation initialization failures.
}

const storedBindings = loadBindings();
SHORTCUTS.forEach((shortcut) => {
  shortcutsStore.getState().register(storedBindings[shortcut.id] ?? shortcut);
});

// persist shortcuts to localStorage whenever they change
shortcutsStore.subscribe((state, prevState) => {
  if (state.shortcuts !== prevState.shortcuts) {
    saveBindings(state.shortcuts);
  }
});

installShortcuts();
