import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
AGENT_FLAG,
resolveLoginItemSettings,
setWin32LoginAgentEnabled
} = require("../desktop/platform/win32-login-agent.cjs");

test("resolveLoginItemSettings disables openAtLogin", () => {
  const off = resolveLoginItemSettings(false);
  assert.equal(off.openAtLogin, false);
  assert.deepEqual(off.args, []);
  assert.equal(typeof off.path, "string");
  assert.equal(AGENT_FLAG, "--agent");
});

test("resolveLoginItemSettings enables --agent for packaged app", () => {
  const prevDefault = process.defaultApp;
  try {
    Object.defineProperty(process, "defaultApp", {
      value: false,
      configurable: true
    });
    const on = resolveLoginItemSettings(true);
    assert.equal(on.openAtLogin, true);
    assert.deepEqual(on.args, [AGENT_FLAG]);
    assert.equal(on.path, process.execPath);
  } finally {
    Object.defineProperty(process, "defaultApp", {
      value: prevDefault,
      configurable: true
    });
  }
});

test("resolveLoginItemSettings uses app entry in defaultApp", () => {
  const prevDefault = process.defaultApp;
  const prevArgv1 = process.argv[1];
  try {
    Object.defineProperty(process, "defaultApp", {
      value: true,
      configurable: true
    });
    process.argv[1] = "/tmp/multichart-main.js";
    const on = resolveLoginItemSettings(true);
    assert.equal(on.openAtLogin, true);
    assert.equal(on.args[1], AGENT_FLAG);
    assert.match(on.args[0], /multichart-main\.js$/);
  } finally {
    Object.defineProperty(process, "defaultApp", {
      value: prevDefault,
      configurable: true
    });
    process.argv[1] = prevArgv1;
  }
});

test("setWin32LoginAgentEnabled calls setLoginItemSettings", () => {
  const calls = [];
  const fakeApp = {
    setLoginItemSettings(settings) {
      calls.push(settings);
    }
  };

  const prevDefault = process.defaultApp;
  Object.defineProperty(process, "defaultApp", {
    value: false,
    configurable: true
  });
  try {
    const result = setWin32LoginAgentEnabled(true, {
      app: fakeApp
    });
    assert.equal(result.ok, true);
    assert.equal(result.enabled, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].openAtLogin, true);
    assert.deepEqual(calls[0].args, [AGENT_FLAG]);
  } finally {
    Object.defineProperty(process, "defaultApp", {
      value: prevDefault,
      configurable: true
    });
  }
});
