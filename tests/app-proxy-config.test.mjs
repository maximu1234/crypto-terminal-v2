import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import {
buildProxyRules,
isProxyConfigReady,
normalizeProxySettings,
PROXY_BYPASS_RULES,
shouldProxyBybitRestUrl
} from "../desktop/app-proxy-config.cjs";
import {
encodeUserPass,
needsSocksAuthRelay,
startSocksAuthRelay,
stopSocksAuthRelay
} from "../desktop/app-proxy-socks-relay.cjs";

test("normalizeProxySettings defaults to SOCKS5 off", () => {
  const cfg = normalizeProxySettings({});
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.type, "socks5");
  assert.equal(cfg.host, "");
  assert.equal(cfg.port, 0);
  assert.equal(isProxyConfigReady(cfg), false);
  assert.equal(buildProxyRules(cfg), "");
});

test("normalizeProxySettings strips protocol and splits host:port", () => {
  const cfg = normalizeProxySettings({
    enabled: true,
    type: "SOCKS5",
    host: "socks5://135.106.176.68:41573",
    username: " user ",
    password: "secret"
  });
  assert.equal(cfg.host, "135.106.176.68");
  assert.equal(cfg.port, 41573);
  assert.equal(cfg.username, "user");
  assert.equal(cfg.password, "secret");
  assert.equal(isProxyConfigReady(cfg), true);
  assert.equal(buildProxyRules(cfg), "socks5://135.106.176.68:41573");
});

test("normalizeProxySettings maps https type to http proxy rules", () => {
  const cfg = normalizeProxySettings({
    enabled: true,
    type: "https",
    host: "proxy.example.com",
    port: "8080"
  });
  assert.equal(cfg.type, "http");
  assert.equal(buildProxyRules(cfg), "http://proxy.example.com:8080");
});

test("enabled without host is stored but not ready", () => {
  const cfg = normalizeProxySettings({
    enabled: true,
    host: "",
    port: 1080
  });
  assert.equal(cfg.enabled, true);
  assert.equal(isProxyConfigReady(cfg), false);
  assert.equal(buildProxyRules(cfg), "");
});

test("SOCKS with login uses a local auth relay, HTTP does not", () => {
  assert.equal(
    needsSocksAuthRelay({
      type: "socks5",
      username: "u",
      password: "p"
    }),
    true
  );
  assert.equal(
    needsSocksAuthRelay({
      type: "http",
      username: "u",
      password: "p"
    }),
    false
  );
  assert.equal(
    needsSocksAuthRelay({
      type: "socks5",
      username: "",
      password: ""
    }),
    false
  );
});

test("encodeUserPass is RFC1929", () => {
  const buf = encodeUserPass("ab", "cd");
  assert.equal(buf[0], 1);
  assert.equal(buf[1], 2);
  assert.equal(buf.subarray(2, 4).toString("utf8"), "ab");
  assert.equal(buf[4], 2);
  assert.equal(buf.subarray(5).toString("utf8"), "cd");
});

function listen(handler) {
  return new Promise((resolve, reject) => {
    const server = net.createServer(handler);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        port: server.address().port
      });
    });
  });
}

function makeReader(socket) {
  let buf = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
  });
  return async function readExact(size) {
    const start = Date.now();
    while (buf.length < size) {
      if (Date.now() - start > 3000) {
        throw new Error(`read timeout want ${size} got ${buf.length}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const out = buf.subarray(0, size);
    buf = buf.subarray(size);
    return out;
  };
}

test("local SOCKS relay logs into remote SOCKS5 with user/pass", async () => {
  const remote = await listen((sock) => {
    const readExact = makeReader(sock);
    void (async () => {
      const greet = await readExact(3);
      assert.deepEqual([...greet], [5, 1, 2]);
      sock.write(Buffer.from([5, 2]));
      const authExpected = encodeUserPass("u", "p");
      const auth = await readExact(authExpected.length);
      assert.deepEqual([...auth], [...authExpected]);
      sock.write(Buffer.from([1, 0]));
      await readExact(10);
      sock.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
      sock.write(Buffer.from("ok"));
    })().catch(() => sock.destroy());
  });

  const localPort = await startSocksAuthRelay({
    host: "127.0.0.1",
    port: remote.port,
    username: "u",
    password: "p"
  });

  const client = net.connect(localPort, "127.0.0.1");
  await new Promise((resolve, reject) => {
    client.once("connect", resolve);
    client.once("error", reject);
  });
  const readExact = makeReader(client);

  client.write(Buffer.from([5, 1, 0]));
  const method = await readExact(2);
  assert.deepEqual([...method], [5, 0]);

  client.write(
    Buffer.from([5, 1, 0, 1, 127, 0, 0, 1, 0, 80])
  );
  const reply = await readExact(10);
  assert.equal(reply[1], 0);

  const payload = await readExact(2);
  assert.equal(payload.toString("utf8"), "ok");

  client.destroy();
  await stopSocksAuthRelay();
  await new Promise((resolve) => remote.server.close(resolve));
});

test("Bybit REST from main (tickers + signed) goes through SOCKS; public WS stays direct", () => {
  assert.equal(
    shouldProxyBybitRestUrl("https://api.bybit.com/v5/market/tickers?symbol=BTCUSDT"),
    true
  );
  assert.equal(
    shouldProxyBybitRestUrl("https://api.bybit.com/v5/position/list"),
    true
  );
  assert.equal(
    shouldProxyBybitRestUrl("https://stream.bybit.com/v5/public/linear"),
    false
  );
  assert.doesNotMatch(
    PROXY_BYPASS_RULES,
    /api\.bybit\.com/
  );
});
