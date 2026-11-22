import test from "node:test";
import assert from "node:assert/strict";
import { parseSystemProxy } from "../desktop/system-proxy-parse.cjs";

test("parseSystemProxy ignores direct and empty results", () => {
  assert.equal(parseSystemProxy(""), null);
  assert.equal(parseSystemProxy("DIRECT"), null);
  assert.equal(parseSystemProxy("direct"), null);
});

test("parseSystemProxy reads the first real proxy", () => {
  assert.deepEqual(
    parseSystemProxy("PROXY 127.0.0.1:7890; SOCKS 127.0.0.1:7891; DIRECT"),
    { url: "http://127.0.0.1:7890" }
  );
  assert.deepEqual(
    parseSystemProxy("DIRECT; SOCKS5 127.0.0.1:1080"),
    { url: "socks5://127.0.0.1:1080" }
  );
  assert.deepEqual(
    parseSystemProxy("SOCKS 10.0.0.1:1080"),
    { url: "socks5://10.0.0.1:1080" }
  );
  assert.deepEqual(
    parseSystemProxy("SOCKS4 10.0.0.1:1080"),
    { url: "socks4://10.0.0.1:1080" }
  );
  assert.deepEqual(
    parseSystemProxy("HTTPS proxy.example:443"),
    { url: "https://proxy.example:443" }
  );
});

test("parseSystemProxy skips malformed endpoints", () => {
  assert.equal(parseSystemProxy("PROXY user:pass@127.0.0.1:7890"), null);
  assert.equal(parseSystemProxy("NOT A PROXY"), null);
});
