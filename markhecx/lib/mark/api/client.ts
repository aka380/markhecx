/** Browser transport. Session cookies are HttpOnly; CSRF tokens live in memory only. */
export type SessionUser = { id: string; name: string; email: string; role: "Creator" | "Brand" };
export class APIError extends Error { constructor(public status: number, message: string) { super(message); } }
let csrf = "";
export function setCSRF(value: string) { csrf = value; }
export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; quiet?: boolean } = {}): Promise<T> {
  const method = options.method || "GET";
  const timeout = AbortSignal.timeout(20000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1";
  let response: Response;
  try { response = await fetch(base + path, { method, credentials: "include", signal, headers: { ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}) }, body: options.body === undefined ? undefined : JSON.stringify(options.body) }); }
  catch (e) { if (options.signal?.aborted) throw e; throw new APIError(0, "Cannot reach the server. Check your connection and try again."); }
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (response.status === 401 && !options.quiet && typeof window !== "undefined") window.dispatchEvent(new Event("markhecx:expired"));
    throw new APIError(response.status, data?.error?.message || "The request could not be completed.");
  }
  return response.status === 204 ? undefined as T : response.json();
}
export function dataChanged() { if (typeof window !== "undefined") window.dispatchEvent(new Event("markhecx:data")); }
