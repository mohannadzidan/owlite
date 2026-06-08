import { request } from "./request";

const getApiBaseUrl = () =>
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? "http://localhost:8080")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080");

const url = (path: string) => `${getApiBaseUrl()}${path}`;

export const apiClient = {
  // Namespaces will be filled in per migration phase
};

export { url, request };
