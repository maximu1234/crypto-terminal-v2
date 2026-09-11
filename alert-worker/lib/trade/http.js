import { setCors, readJsonBody } from "../client-http.js";
import { tradeHealth, runTradeRpc, verifyTradeRequest } from "./rpc.js";

export async function handleTradeHttp(req, res) {
  const pathOnly = (req.url || "").split("?")[0];
  if (pathOnly !== "/trade/rpc" && pathOnly !== "/trade/health") {
    return false;
  }

  setCors(res, req);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (pathOnly === "/trade/health") {
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end("Method not allowed");
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, trade: tradeHealth() }));
    return true;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method not allowed");
    return true;
  }

  const session = verifyTradeRequest(req);
  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid_token" }));
    return true;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid json" }));
    return true;
  }

  try {
    const result = await runTradeRpc(body.method, body.payload || {});
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result ?? { ok: false }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: false,
        message: err?.message || "trade_rpc_failed"
      })
    );
  }
  return true;
}
