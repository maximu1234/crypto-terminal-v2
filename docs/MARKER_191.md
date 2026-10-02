# Метка 191 — IndexedDB for drawings (phase 5 v1)

**Тег:** `metka-191`  
**Откат инициативы chrome/chart:** `metka-181`

## Что вошло

- `js/drawings-idb.js` — IndexedDB store для JSON-блобов рисунков.
- `js/drawings-kv.js` — sync API (memory cache) + background migrate LS→IDB.
- Dual-write в localStorage: cross-tab `storage` events + безопасный откат.
- Wired: `drawings-persist`, `drawings-storage`, `drawings-storage-poller`.
- Meta (tombstones / sync flags) остаются в localStorage.
- Критический путь свечей/алертов не await-ит hydrate.

## Следующий шаг (позже)

- ~~Убрать LS dual-write, cross-tab через BroadcastChannel.~~ → **metka-193**
- Quota smoke на больших volume profile / brush.

## Версии

- Web marker: `v0.191`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
