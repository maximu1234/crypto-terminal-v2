import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function loadWinSnapshot() {
  const requireWin = createRequire(
    path.join(ROOT, "desktop/chart-snapshot-win.cjs")
  );
  const Module = requireWin("module");
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        BrowserWindow: {
          fromWebContents() {
            return {
              getContentSize() {
                return [1280, 720];
              }
            };
          }
        },
        nativeImage: {
          createFromBuffer() {
            return null;
          }
        }
      };
    }
    if (request === "electron-log") {
      return {
        info() {},
        warn() {},
        error() {},
        debug() {}
      };
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    return requireWin("./chart-snapshot-win.cjs");
  } finally {
    Module._load = originalLoad;
  }
}

const {
  clampCrop,
  cssViewportFromLayoutMetrics,
  scaleDipRectToImage
} = loadWinSnapshot();

test("windows snapshot crop keeps chart width when CSS viewport matches the bitmap", () => {
  const crop = scaleDipRectToImage(
    {
      x: 0,
      y: 80,
      width: 1600,
      height: 900
    },
    {
      width: 1920,
      height: 1080
    },
    {
      width: 1920,
      height: 1080
    }
  );
  assert.deepEqual(crop, {
    x: 0,
    y: 80,
    width: 1600,
    height: 900
  });
});

test("windows snapshot crop maps CSS rect through device scale", () => {
  const crop = scaleDipRectToImage(
    {
      x: 10,
      y: 40,
      width: 800,
      height: 400
    },
    {
      width: 2400,
      height: 1350
    },
    {
      width: 1920,
      height: 1080
    }
  );
  assert.deepEqual(crop, {
    x: 13,
    y: 50,
    width: 1000,
    height: 500
  });
});

test("windows snapshot crop does not swallow the coins list when getContentSize is smaller than CSS", () => {
  const dipRect = {
    x: 0,
    y: 80,
    width: 1600,
    height: 900
  };
  const imageSize = {
    width: 1920,
    height: 1080
  };
  const cssViewport = {
    width: 1920,
    height: 1080
  };
  const contentSize = {
    width: 1280,
    height: 720
  };

  const fixed = scaleDipRectToImage(
    dipRect,
    imageSize,
    cssViewport
  );
  assert.equal(fixed.width, 1600);
  assert.ok(fixed.width < imageSize.width);

  const buggy = scaleDipRectToImage(
    dipRect,
    imageSize,
    contentSize
  );
  assert.equal(buggy.width, imageSize.width);
});

test("windows snapshot layout metrics prefer CSS viewport fields", () => {
  const vp = cssViewportFromLayoutMetrics({
    cssVisualViewport: {
      clientWidth: 1920,
      clientHeight: 1080
    },
    layoutViewport: {
      clientWidth: 2400,
      clientHeight: 1350
    }
  });
  assert.deepEqual(vp, {
    width: 1920,
    height: 1080
  });
  assert.equal(
    cssViewportFromLayoutMetrics({
      layoutViewport: {
        clientWidth: 2400,
        clientHeight: 1350
      }
    }),
    null
  );
});

test("windows snapshot clampCrop stays inside the bitmap", () => {
  const crop = clampCrop(
    {
      x: -10,
      y: 1000,
      width: 5000,
      height: 20
    },
    {
      width: 100,
      height: 80
    }
  );
  assert.deepEqual(crop, {
    x: 0,
    y: 79,
    width: 100,
    height: 1
  });
});
