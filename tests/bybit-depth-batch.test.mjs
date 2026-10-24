import test from "node:test";
import assert from "node:assert/strict";
import { createDepthBatcher } from "../desktop/trading/bybit-depth-batch.cjs";

test("depth batch drops deltas that arrived before a snapshot", () => {
  const emitted = [];
  const batcher = createDepthBatcher((messages) => {
    emitted.push(messages);
  });
  batcher.push({ type: "delta", data: { u: 1 } });
  batcher.push({ type: "snapshot", data: { u: 2 } });
  batcher.push({ type: "delta", data: { u: 3 } });
  batcher.push({ op: "pong" });
  batcher.flush();
  assert.equal(emitted.length, 1);
  assert.deepEqual(
    emitted[0].map((row) => row.type),
    ["snapshot", "delta"]
  );
  assert.equal(emitted[0][1].data.u, 3);
  batcher.stop();
});

test("depth batch stop discards a pending flush", () => {
  const emitted = [];
  const batcher = createDepthBatcher((messages) => {
    emitted.push(messages);
  });
  batcher.push({ type: "delta", data: { u: 1 } });
  batcher.stop();
  batcher.flush();
  assert.deepEqual(emitted, []);
});
