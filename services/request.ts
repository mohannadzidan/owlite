export async function request<T, C extends string = never>(
  ...args: Parameters<typeof fetch>
): Promise<ErrorResponse<C | "network_error" | "internal_server_error"> | Awaited<T>> {
  try {
    const response = await fetch(...args);
    if (response.status >= 500) {
      return {
        error: {
          code: "internal_server_error",
          message: `Server error with status ${response.status}`,
        },
      };
    }
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Request error:", e);
    return {
      error: {
        code: "network_error",
        message: String(e instanceof Error ? e.message : e),
      },
    };
  }
}

export type ErrorResponse<C extends string = string> = {
  error: {
    code: C;
    message: string;
  };
};

function isErrorResponse<C extends string>(data: unknown): data is ErrorResponse<C> {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "object" &&
    data.error !== null &&
    "code" in data.error &&
    "message" in data.error &&
    typeof data.error.code === "string" &&
    typeof data.error.message === "string"
  );
}

export async function errorThrower<T>(promise: Promise<T>): Promise<T> {
  const result = await promise;
  if (isErrorResponse(result)) {
    throw result;
  }
  return result as T;
}
