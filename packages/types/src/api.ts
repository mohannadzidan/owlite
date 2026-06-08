export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "not_found"
  | "internal_server_error"
  | "could_not_resolve";

export type ApiError = { error: { code: ApiErrorCode; message: string } };
