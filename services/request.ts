export async function request<T>(...args: Parameters<typeof fetch>) {
  const response = await fetch(...args);
  const data = await response.json();
  return data as T;
}

export async function post(url: string, body: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
