# Метка 192 — drawings KV: alerts / DOM + logout

**Тег:** `metka-192`  
**Откат инициативы chrome/chart:** `metka-181`

## Что вошло

- `js/alerts.js` — чтение/запись рисунков через `drawingsKv*` (больше не raw localStorage).
- `js/scalping-dom/drawing-overlay.js` — то же для DOM-оверлея.
- `js/cloud-sync.js` `signOutCloud` — **не** стирает `drawings_*` (как в `DRAWINGS_REGRESSION`: logout → local drawings остаются). Реестр/история алертов по-прежнему чистятся.

## Версии

- Web marker: `v0.192`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
