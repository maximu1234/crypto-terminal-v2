import test from "node:test";
import assert from "node:assert/strict";
import {
  createRequire
} from "node:module";

const require =
createRequire(
import.meta.url
);

const {
  startDesktopHandoffServer,
  DESKTOP_HANDOFF_PORT
} =
require(
"../desktop/desktop-handoff-server.cjs"
);

test("desktop handoff /open navigates payload", async () => {
  const opens =
  [];

  const handoff =
  await startDesktopHandoffServer({
    log: {
      info() {},
      warn() {}
    },
    onOpen(
      payload
    ) {
      opens.push(
        payload
      );
    }
  });

  if(
    handoff.port ==
    null
  ) {
    await handoff.close();
    return;
  }

  try {
    const res =
    await fetch(
      `http://127.0.0.1:${DESKTOP_HANDOFF_PORT}/open?symbol=GRASSUSDT&tf=15&exchange=bybit`
    );
    const body =
    await res.json();

    assert.equal(
      res.status,
      200
    );
    assert.equal(
      body.ok,
      true
    );
    assert.deepEqual(
      opens[
      0
      ],
      {
        symbol:
        "GRASSUSDT",
        tf:
        "15",
        exchange:
        "bybit"
      }
    );
  } finally {
    await handoff.close();
  }
});

test("desktop handoff /ping ok", async () => {
  const handoff =
  await startDesktopHandoffServer({
    log: {
      info() {},
      warn() {}
    },
    onOpen() {}
  });

  if(
    handoff.port ==
    null
  ) {
    await handoff.close();
    return;
  }

  try {
    const res =
    await fetch(
      `http://127.0.0.1:${DESKTOP_HANDOFF_PORT}/ping`
    );
    const body =
    await res.json();

    assert.equal(
      body.service,
      "multichart-desktop"
    );
  } finally {
    await handoff.close();
  }
});
