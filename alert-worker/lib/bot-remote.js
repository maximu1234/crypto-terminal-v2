import { WebSocketServer, WebSocket } from "ws";
import {
  readJsonBody,
  setCors,
  verifyUserFromRequest,
  verifyUserToken
} from "./client-http.js";

/**
 * Outbound bot control: Algo Bot connects via WS; Multichart sends HTTP commands.
 * Registry: userId → { socket, meta }
 */

/** @type {Map<string, { socket: WebSocket, meta: object }>} */
const botsByUserId = new Map();

function extractBearer(req) {

  const auth =
    req.headers.authorization || "";

  if (auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }

  try{
    const u = new URL(
      req.url || "",
      "http://localhost"
    );
    const q =
      String(
        u.searchParams.get("access_token") ||
        ""
      ).trim();

    return q || "";
  }catch{
    return "";
  }

}

function isOpen(socket) {

  return (
    socket &&
    socket.readyState === WebSocket.OPEN
  );

}

function readMeta(entry) {

  const meta =
    entry?.meta || {};

  return {
    online: isOpen(entry?.socket),
    running: meta.running === true,
    host: meta.host || null,
    app: meta.app || null,
    instanceId: meta.instanceId || null,
    lastSeenAt: meta.at || null
  };

}

function registerBot(userId, socket, meta = {}) {

  const prev =
    botsByUserId.get(userId);

  if (
    prev?.socket &&
    prev.socket !== socket
  ) {
    try{
      prev.socket.close(4000, "replaced");
    }catch{
      /* ignore */
    }
  }

  botsByUserId.set(userId, {
    socket,
    meta: {
      ...meta,
      at: new Date().toISOString()
    }
  });

}

function unregisterBot(userId, socket) {

  const cur =
    botsByUserId.get(userId);

  if (
    cur &&
    cur.socket === socket
  ) {
    botsByUserId.delete(userId);
  }

}

function updateMeta(userId, patch) {

  const cur =
    botsByUserId.get(userId);

  if (!cur) {
    return;
  }

  cur.meta = {
    ...cur.meta,
    ...patch,
    at: new Date().toISOString()
  };

}

function sendCommand(userId, action) {

  const entry =
    botsByUserId.get(userId);

  if (!isOpen(entry?.socket)) {
    return {
      ok: false,
      error: "bot_offline"
    };
  }

  try{
    entry.socket.send(
      JSON.stringify({
        type: "command",
        action,
        at: new Date().toISOString()
      })
    );
    return {
      ok: true,
      delivered: true
    };
  }catch(err){
    return {
      ok: false,
      error: err?.message || "send_failed"
    };
  }

}

/**
 * Attach WebSocketServer to HTTP server (path /bot-remote/ws).
 * @param {import("http").Server} server
 */
export function attachBotRemoteWs(server) {

  const wss = new WebSocketServer({
    noServer: true
  });

  server.on("upgrade", (req, socket, head) => {

    const pathOnly =
      (req.url || "").split("?")[0];

    if (pathOnly !== "/bot-remote/ws") {
      return;
    }

    void (async () => {

      const token =
        extractBearer(req);
      const user =
        await verifyUserToken(token);

      if (!user?.id) {
        socket.write(
          "HTTP/1.1 401 Unauthorized\r\n\r\n"
        );
        socket.destroy();
        return;
      }

      wss.handleUpgrade(
        req,
        socket,
        head,
        (ws) => {
          wss.emit("connection", ws, req, user);
        }
      );

    })().catch(() => {
      try{
        socket.destroy();
      }catch{
        /* ignore */
      }
    });

  });

  wss.on("connection", (ws, _req, user) => {

    const userId =
      String(user.id);

    registerBot(userId, ws, {
      running: false,
      host: null,
      app: "Algo Bot"
    });

    console.log(
      "bot-remote connected",
      user.email || userId
    );

    ws.on("message", (raw) => {

      let msg;

      try{
        msg = JSON.parse(
          String(raw || "")
        );
      }catch{
        return;
      }

      if (
        msg?.type === "status" ||
        msg?.type === "heartbeat"
      ) {
        updateMeta(userId, {
          running: msg.running === true,
          host: msg.host
            ? String(msg.host)
            : null,
          app: msg.app
            ? String(msg.app)
            : null,
          instanceId: msg.instanceId
            ? String(msg.instanceId)
            : null
        });
      }

    });

    ws.on("close", () => {
      unregisterBot(userId, ws);
      console.log(
        "bot-remote disconnected",
        user.email || userId
      );
    });

    ws.on("error", () => {
      unregisterBot(userId, ws);
    });

    try{
      ws.send(
        JSON.stringify({
          type: "hello",
          at: new Date().toISOString()
        })
      );
    }catch{
      /* ignore */
    }

  });

  return wss;

}

/**
 * HTTP: GET /bot-remote/status, POST /bot-remote/command
 * @returns {Promise<boolean>}
 */
export async function handleBotRemoteHttp(req, res) {

  const pathOnly =
    (req.url || "").split("?")[0];

  if (
    pathOnly !== "/bot-remote/status" &&
    pathOnly !== "/bot-remote/command"
  ) {
    return false;
  }

  setCors(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  const user =
    await verifyUserFromRequest(req);

  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: "invalid_token"
    }));
    return true;
  }

  if (pathOnly === "/bot-remote/status") {

    if (req.method !== "GET") {
      res.writeHead(405);
      res.end("Method not allowed");
      return true;
    }

    const entry =
      botsByUserId.get(user.id);
    const status =
      readMeta(entry);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      ...status
    }));
    return true;

  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method not allowed");
    return true;
  }

  let body;

  try{
    body = await readJsonBody(req);
  }catch(err){
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err.message
    }));
    return true;
  }

  const action =
    String(body?.action || "")
      .trim()
      .toLowerCase();

  if (
    action !== "start" &&
    action !== "stop"
  ) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: "bad_action"
    }));
    return true;
  }

  const result =
    sendCommand(user.id, action);

  if (!result.ok) {
    const code =
      result.error === "bot_offline"
        ? 409
        : 500;
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return true;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
  return true;

}

export function getBotRemoteStats() {

  let online = 0;

  for (const entry of botsByUserId.values()) {
    if (isOpen(entry.socket)) {
      online += 1;
    }
  }

  return {
    onlineBots: online
  };

}
