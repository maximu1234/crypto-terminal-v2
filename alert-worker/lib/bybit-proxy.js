import { setPublicCors } from "./client-http.js";

const BASES = [
  "https://api.bybit.com",
  "https://api.bytick.com"
];

/**
 * GET /bybit?path=/v5/market/tickers?category=linear
 * Публичный REST-прокси (без auth) — для браузера, когда api.bybit.com недоступен.
 */
export async function handleBybitProxy(req, res) {

  const pathOnly = (req.url || "").split("?")[0];

  if (pathOnly !== "/bybit") {
    return false;
  }

  setPublicCors(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ retCode: -1, retMsg: "method_not_allowed" }));
    return true;
  }

  const q = new URL(req.url || "/", "http://localhost");
  const apiPath = q.searchParams.get("path") || "";

  if (!apiPath.startsWith("/v5/")) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ retCode: -1, retMsg: "invalid path" }));
    return true;
  }

  let lastErr = null;

  for (const base of BASES) {

    try {
      const upstream = await fetch(`${base}${apiPath}`, {
        headers: { Accept: "application/json" }
      });
      const body = await upstream.text();

      res.writeHead(upstream.status, {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      });
      res.end(body);
      return true;
    } catch (err) {
      lastErr = err;
    }

  }

  res.writeHead(502, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    retCode: -1,
    retMsg: lastErr?.message || "upstream failed"
  }));

  return true;

}
