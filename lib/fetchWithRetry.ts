/** Exponential backoff with jitter. Fail fast on 4xx (our bug), retry 5xx and 429. */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  attempts = 4,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('HTTP 4')) throw err;
      lastErr = err;
    }
    const backoff = 1000 * 2 ** i + Math.random() * 500;
    await new Promise((r) => setTimeout(r, backoff));
  }
  throw lastErr;
}
