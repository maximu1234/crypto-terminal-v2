# Метка 62 — desktop: platform в electron-builder (июль 2026)

**Тег:** `metka-62`

## Что вошло

- Исправлен запуск desktop `.app` / `.exe`: в `desktop/package.json` → `build.files` добавлен `platform/**`.
- Без этого папка `desktop/platform/` не попадала в `app.asar` и приложение падало с `Cannot find module './platform/index.cjs'`.

## Версии

- Web marker: `v0.62`
- Desktop app: `v1.0.55` (Mac `.dmg` → `desktop-v1.0.55`, Win `.exe` → `desktop-win-v1.0.55`)
