import test from "node:test";
import assert from "node:assert/strict";

const mem = new Map();
globalThis.localStorage = {
  getItem(key) {
    return mem.has(key) ? mem.get(key) : null;
  },
  setItem(key, value) {
    mem.set(key, String(value));
  },
  removeItem(key) {
    mem.delete(key);
  }
};
globalThis.window = globalThis;

const {
  emptyFavorites,
  saveFavoritesGroups,
  setFavoriteGroup,
  hasUnsyncedFavoritesCloud,
  saveFavoritesCloudUpdatedAt,
  saveFavoritesCloudSyncedSignature,
  loadFavoritesCloudUpdatedAt
} = await import("../js/favorites.js");

test("saving a flag marks favorites unsynced before any cloud request", () => {
  const exchangeId = "bybit";
  const base = emptyFavorites();
  saveFavoritesGroups(base, exchangeId);
  saveFavoritesCloudSyncedSignature(base, exchangeId);
  const future = "2099-01-01T00:00:00.000Z";
  saveFavoritesCloudUpdatedAt(future, exchangeId);
  assert.equal(hasUnsyncedFavoritesCloud(exchangeId), false);

  const next = setFavoriteGroup("BTCUSDT", "green", base);
  saveFavoritesGroups(next, exchangeId);

  assert.equal(hasUnsyncedFavoritesCloud(exchangeId), true);
  assert.notEqual(loadFavoritesCloudUpdatedAt(exchangeId), future);
});
