const KEY = "owlite_profile";

export function getClientProfileId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem(KEY) ?? undefined;
}

export function setClientProfileId(id: string): void {
  sessionStorage.setItem(KEY, id);
}

export function clearClientProfileId(): void {
  sessionStorage.removeItem(KEY);
}
