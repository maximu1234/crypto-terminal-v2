/**
 * BingX desktop: private WS → renderer. Live state from main snapshot/push —
 * no independent REST polling (rate-limit safe).
 */
import {
applyTradePositionsStream,
syncTradePositionsCache
} from "./positions-cache.js?v=3";

import {
isTradePositionSoundBaselineReady
} from "../../trade-position-sounds.js?v=3";

import {
isExchangeTradingEnabled
} from "../../market-api.js?v=2";

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

  applyTradePositionsStream(positions, {
    establishBaseline:
      initialStreamSyncDone && !isTradePositionSoundBaselineReady()
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

  initialStreamSyncDone = true;
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

  if (payload.type === "positions") {
    const positions = Array.isArray(payload.positions)
      ? payload.positions
      : [];

    applyTradePositionsStream(positions, {
      establishBaseline:
        initialStreamSyncDone && !isTradePositionSoundBaselineReady()
    });

    dispatch("trade-stream-positions", {
      positions
    });

    window.dispatchEvent(new CustomEvent("trade-open-positions-changed"));
    initialStreamSyncDone = true;
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
    initialStreamSyncDone = true;
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
