/** Same-origin browser gateway. Credentials remain HTTP-only cookies. */
async function forward(request: Request) {
  const incoming = new URL(request.url);
  const base = process.env.MARKHECX_API_URL || "http://127.0.0.1:4000/api/v1";
  const path = incoming.pathname.slice("/api/v1".length);
  const headers = new Headers();
  for (const key of [
    "content-type",
    "cookie",
    "origin",
    "x-csrf-token",
    "x-account-id",
  ]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const upstream = await fetch(
      base.replace(/\/$/, "") + path + incoming.search,
      {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : await request.arrayBuffer(),
        redirect: "manual",
        signal: AbortSignal.timeout(40000),
      },
    );
    const responseHeaders = new Headers();
    for (const key of [
      "content-type",
      "cache-control",
      "x-request-id",
      "retry-after",
    ]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append("set-cookie", cookie);
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "api_unavailable",
          message:
            "The API server is unavailable. Start or reconnect the backend and retry.",
        },
      },
      { status: 503 },
    );
  }
}
export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
};
