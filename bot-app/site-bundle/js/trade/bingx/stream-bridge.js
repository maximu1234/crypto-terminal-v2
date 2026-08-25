/**
 * BingX desktop: private WS → renderer. Live state from main snapshot/push —
 * no independent REST polling (rate-limit safe).
 */
import {
applyTradePositionsStream,
syncTradePositionsCache
} from "./positions-cache.js?v=5";

import {
isExchangeTradingEnabled
} from "../../market-api.js?v=6";

let unsubscribe = null;
let visibilityHandler = null;
let initialStreamSyncDone = false;
let bridgeStarted = false;

function dispatch(name, detail) {
  window.dispatchEvent(
    new CustomEvent(name, {
      detail
    })
  );
}

function applySnapshot(snapshot) {
  if (!snapshot?.ok) {
    return snapshot;
  }

  const positions = Array.isArray(snapshot.positions)
    ? snapshot.positions
    : [];
  const orders = Array.isArray(snapshot.orders) ? snapshot.orders : [];
  const seedDone = !!snapshot.seedDone;

  /* Silent baseline ONLY while seed is still incomplete.
   * Using `!initial || !seedDone` made the first seedDone snapshot (often the
   * soft-skip right after our open) absorb the new position without sound. */
  applyTradePositionsStream(positions, {
    establishBaseline: !initialStreamSyncDone && !seedDone
  });

  dispatch("trade-stream-positions", {
    positions
  });
  window.dispatchEvent(new CustomEvent("trade-open-positions-changed"));

  dispatch("trade-stream-orders", {
    orders
  });
  window.dispatchEvent(
    new CustomEvent("trade-orders-refresh", {
      detail: {
        orders
      }
    })
  );

  if (seedDone) {
    initialStreamSyncDone = true;
  }
  return snapshot;
}

async function pullStreamSnapshot() {
  const api = window.cryptoTerminalDesktop?.trading;
  if (!api?.getStreamSnapshot) {
    /* Older desktop builds: fall back to cache sync once. */
    return syncTradePositionsCache();
  }

  try {
    const status = await api.getStatus?.();
    if (!status?.configured) {
      applyTradePositionsStream([], {
        resetBaseline: true
      });
      return {
        ok: false
      };
    }

    const snapshot = await api.getStreamSnapshot();
    return applySnapshot(snapshot);
  } catch {
    return null;
  }
}

function handleStreamPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (
    payload.exchangeId &&
    payload.exchangeId !== "bingx"
  ) {
    return;
  }

  if (payload.type === "positions") {
    const positions = Array.isArray(payload.positions)
      ? payload.positions
      : [];

    /* Live pushes must use sound diff — silent establish here ate BingX opens
     * into the baseline before seedDone flipped (no open sound). */
    applyTradePositionsStream(positions, {
      establishBaseline: false
    });

    dispatch("trade-stream-positions", {
      positions
    });

    window.dispatchEvent(new CustomEvent("trade-open-positions-changed"));
    return;
  }

  if (payload.type === "orders") {
    const orders = Array.isArray(payload.orders) ? payload.orders : [];

    dispatch("trade-stream-orders", {
      orders
    });

    window.dispatchEvent(
      new CustomEvent("trade-orders-refresh", {
        detail: {
          orders
        }
      })
    );
  }
}

export function stopTradeStreamBridge() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }

  bridgeStarted = false;
  initialStreamSyncDone = false;
}

export async function startTradeStreamBridge() {
  if (bridgeStarted || !isExchangeTradingEnabled()) {
    return;
  }

  bridgeStarted = true;
  await initTradeStreamBridge();
}

export async function initTradeStreamBridge() {
  if (!document.body.classList.contains("trade-page")) {
    return () => {};
  }

  if (!isExchangeTradingEnabled()) {
    return () => {};
  }

  const api = window.cryptoTerminalDesktop?.trading;

  if (!api?.onStream) {
    return () => {};
  }

  if (unsubscribe) {
    return unsubscribe;
  }

  bridgeStarted = true;

  unsubscribe = api.onStream(handleStreamPayload);

  try {
    await api.replayStream?.();
    await pullStreamSnapshot();
  } catch {
    /* ignore */
  }

  visibilityHandler = () => {
    if (document.hidden) {
      return;
    }
    void pullStreamSnapshot();
  };

  document.addEventListener("visibilitychange", visibilityHandler);

  return () => {
    stopTradeStreamBridge();
  };
}
