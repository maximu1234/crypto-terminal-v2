import assert from "node:assert/strict";
import test from "node:test";

import {
  handleDragCrosshairPlotXY,
  handleVertexPlotXY,
  listHandleScreenPoints
} from "../js/drawings/draw-edit-interaction.js";
import {
  getPositionHandleScreens
} from "../js/drawings/position.js";
import {
  listElliottHandles,
  PATTERN_12
} from "../js/drawings/elliott-spec.js";

const toXY = (point) => {
  if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.price)) {
    return null;
  }
  return {
    x: point.time,
    y: point.price
  };
};

const plotPriceToCoordinate = (price) =>
  Number.isFinite(price)
    ? price
    : null;

const leakedListHandles = () => [
  {
    id: "from-list",
    point: {
      time: 99,
      price: 99
    }
  }
];

function adapters(extra = {}) {
  return {
    toXY,
    listHandles: leakedListHandles,
    ...extra
  };
}

test("handle vertex plot is the screen id, not the click", () => {
  assert.deepEqual(
    handleVertexPlotXY(
      [
        { id: "p1", x: 12, y: 40 },
        { id: "p2", x: 80, y: 18 }
      ],
      "p2"
    ),
    { x: 80, y: 18 }
  );
  assert.equal(
    handleVertexPlotXY(
      [{ id: "p1", x: 12, y: 40 }],
      "tp"
    ),
    null
  );
});

test("handle drag crosshair subtracts grab offset only in handle mode", () => {
  assert.deepEqual(
    handleDragCrosshairPlotXY(
      {
        mode: "handle",
        grabOffsetX: 6,
        grabOffsetY: -4
      },
      40,
      80
    ),
    { x: 34, y: 84 }
  );
  assert.deepEqual(
    handleDragCrosshairPlotXY(
      {
        mode: "screen-move"
      },
      40,
      80
    ),
    { x: 40, y: 80 }
  );
});

test("listHandleScreenPoints uses trendline / fib / channel vertices", () => {
  assert.deepEqual(
    listHandleScreenPoints(
      {
        type: "trendline",
        p1: { time: 1, price: 10 },
        p2: { time: 5, price: 20 }
      },
      {
        toXY,
        listHandles: (shape) => [
          { id: "p1", point: shape.p1 },
          { id: "p2", point: shape.p2 }
        ]
      }
    ),
    [
      { id: "p1", x: 1, y: 10 },
      { id: "p2", x: 5, y: 20 }
    ]
  );

  assert.deepEqual(
    listHandleScreenPoints(
      {
        type: "fib-ext",
        p1: { time: 1, price: 10 },
        p2: { time: 2, price: 20 },
        p3: { time: 3, price: 15 }
      },
      {
        toXY,
        listHandles: (shape) => [
          { id: "p1", point: shape.p1 },
          { id: "p2", point: shape.p2 },
          { id: "p3", point: shape.p3 }
        ]
      }
    ),
    [
      { id: "p1", x: 1, y: 10 },
      { id: "p2", x: 2, y: 20 },
      { id: "p3", x: 3, y: 15 }
    ]
  );

  assert.deepEqual(
    listHandleScreenPoints(
      {
        type: "channel",
        p1: { time: 0, price: 1 },
        p2: { time: 4, price: 1 },
        p3: { time: 0, price: 8 }
      },
      {
        toXY,
        listHandles: () => [
          { id: "p1", point: { time: 0, price: 1 } },
          { id: "p2", point: { time: 4, price: 1 } },
          { id: "p3", point: { time: 0, price: 8 } },
          { id: "p4", point: { time: 4, price: 8 } }
        ]
      }
    ).map((h) => h.id),
    ["p1", "p2", "p3", "p4"]
  );
});

test("listHandleScreenPoints uses rectangle corners/edges, not p1/p2 list", () => {
  const screens = listHandleScreenPoints(
    {
      type: "rectangle",
      p1: { time: 10, price: 80 },
      p2: { time: 40, price: 20 }
    },
    adapters()
  );

  assert.equal(
    screens.some((h) => h.id === "from-list"),
    false
  );
  assert.deepEqual(
    screens.map((h) => h.id),
    ["nw", "ne", "se", "sw", "n", "e", "s", "w"]
  );
  assert.deepEqual(
    handleVertexPlotXY(screens, "nw"),
    { x: 10, y: 20 }
  );
  assert.deepEqual(
    handleVertexPlotXY(screens, "e"),
    { x: 40, y: 50 }
  );
});

test("listHandleScreenPoints does not fall back to listHandles for FVP", () => {
  const screens = listHandleScreenPoints(
    {
      type: "fvp",
      p1: { time: 1, price: 2 },
      p2: { time: 3, price: 4 }
    },
    adapters({
      getCandles: () => []
    })
  );

  assert.equal(
    screens.some((h) => h.id === "from-list"),
    false
  );
});

test("listHandleScreenPoints uses position TP/SL screens", () => {
  const shape = {
    type: "long",
    p1: { time: 10, price: 50 },
    p2: { time: 30, price: 50 },
    tpPrice: 60,
    slPrice: 40
  };
  const screens = listHandleScreenPoints(
    shape,
    adapters({
      getPositionHandleScreens: (item) =>
        getPositionHandleScreens(
          item,
          toXY,
          plotPriceToCoordinate
        )
    })
  );

  assert.deepEqual(
    screens.map((h) => h.id),
    ["entryL", "entryR", "tp", "sl"]
  );
  assert.deepEqual(
    handleVertexPlotXY(screens, "tp"),
    { x: 10, y: 60 }
  );
});

test("listHandleScreenPoints maps elliott / pattern vertices", () => {
  const shape = {
    type: PATTERN_12,
    points: [
      { time: 1, price: 10 },
      { time: 2, price: 20 },
      { time: 3, price: 15 },
      { time: 4, price: 25 },
      { time: 5, price: 18 }
    ]
  };
  const screens = listHandleScreenPoints(
    shape,
    {
      toXY,
      listHandles: listElliottHandles
    }
  );

  assert.equal(screens.length, 5);
  assert.deepEqual(
    handleVertexPlotXY(screens, screens[2].id),
    { x: 3, y: 15 }
  );
});
