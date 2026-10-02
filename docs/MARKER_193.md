# Метка 193 — drawings IDB без LS dual-write (BroadcastChannel)

**Тег:** `metka-193`  
**Откат инициативы chrome/chart:** `metka-181`

## Что вошло

- `js/drawings-kv.js` — payloads: memory + IndexedDB; cross-tab через `BroadcastChannel`.
- После migrate LS→IDB — **purge** payload-ключей из localStorage (`drawings_idb_ls_purged_v1`).
- Meta (tombstones / sync flags) остаются в LS.
- Если IndexedDB недоступен — fallback только в LS (без IDB).
- `js/drawings-storage-poller.js` — слушает KV BroadcastChannel, не `window.storage`.
- `alerts` / `drawings-storage` — enumeration через `drawingsKvListKeys*`.

## Версии

- Web marker: `v0.193`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
