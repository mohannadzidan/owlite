export const SESSION_COOKIE_NAME = "owlite_session_id";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
export const CLIENT_ERROR_ENDPOINT = "/api/client-errors";
export const CLIENT_LOG_ENDPOINT = "/api/client-logs";

export type ClientErrorEventType = "error" | "unhandledrejection";

export type ConsoleMethodName = keyof Pick<
  Console,
  | "log"
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "trace"
  | "dir"
  | "dirxml"
  | "table"
  | "group"
  | "groupCollapsed"
  | "groupEnd"
  | "clear"
  | "count"
  | "countReset"
  | "assert"
  | "time"
  | "timeLog"
  | "timeEnd"
  | "timeStamp"
  | "profile"
  | "profileEnd"
>;

export type ClientErrorPayload = {
  sessionId: string;
  type: ClientErrorEventType;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url: string;
  userAgent: string;
  timestamp: number;
};

export type ClientLogPayload = {
  sessionId: string;
  method: ConsoleMethodName;
  args: string[];
  url: string;
  userAgent: string;
  timestamp: number;
};
