import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
AGENT_FLAG,
buildPlistXml,
hasAgentArg
} = require("../desktop/platform/darwin-login-agent.cjs");

test("hasAgentArg detects --agent", () => {
  assert.equal(hasAgentArg(["node", "app", AGENT_FLAG]), true);
  assert.equal(hasAgentArg(["node", "app"]), false);
});

test("buildPlistXml escapes paths and includes RunAtLoad", () => {
  const xml = buildPlistXml([
    "/Applications/Multichart.app/Contents/MacOS/Multichart",
    "--agent"
  ]);

  assert.match(xml, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(
    xml,
    /<string>\/Applications\/Multichart\.app\/Contents\/MacOS\/Multichart<\/string>/
  );
  assert.match(xml, /<string>--agent<\/string>/);
  assert.match(xml, /com\.multichart\.desktop\.agent/);
});

test("buildPlistXml escapes XML special chars in paths", () => {
  const xml = buildPlistXml(["/tmp/a&b<c>.app", "--agent"]);
  assert.match(xml, /\/tmp\/a&amp;b&lt;c&gt;\.app/);
});
