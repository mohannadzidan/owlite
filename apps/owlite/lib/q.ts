export default function q(
  searchParams: Record<string, string | boolean | number | undefined>,
  baseParams?: URLSearchParams | Record<string, string | boolean | number | undefined>,
): string {
  const params = baseParams instanceof URLSearchParams ? baseParams : new URLSearchParams();
  if (!(baseParams instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(baseParams || {})) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  return params.toString();
}
