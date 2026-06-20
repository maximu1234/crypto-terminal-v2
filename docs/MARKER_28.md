# Метка 28 — рабочая версия (июнь 2026)

**Тег:** `metka-28` · **Коммит:** `git rev-parse metka-28`

**Текущий эталон отката.** Предыдущий: [MARKER_27.md](./MARKER_27.md) (`metka-27`).

Проверено: desktop **Multichart 1.0.15** — локальный UI, вход по email, графики на `/coins`; CI gate (manifest, nav, unit tests).

## Что добавлено после metka-27

### Desktop .app (Multichart 1.0.8 → 1.0.15)
- **Bundled UI** — `site-bundle/` внутри `.app` (копия репо при сборке)
- **Локальный HTTP** (`127.0.0.1`) для HTML/CSS/JS — ES-модули и `css-ready` работают стабильно
- `/api/*` → прокси на Vercel; Bybit REST/WS — напрямую
- **Auth:** `multichart://auth/callback`, paste-link в настройках
- **Auto-update** через GitHub Releases (`desktop-v*`)
- CI: `bundle-site.cjs`, secrets Supabase в desktop-release workflow

### Исправления desktop
- Путь `app.asar.unpacked/site-bundle`
- `path.join` для абсolute `/css`, `/js` в protocol handler
- Fallback на Vercel при пустом DOM
- Синтаксис `local-site-server.cjs` (1.0.15)

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 12 |
| `desktop-app-ui.js` | 2 |
| `desktop/package.json` | 1.0.15 |
| `coins.css` | 41 |
| `terminal.css` | 138 |
| `terminal.js` | 312 |

## Аудит (июнь 2026)

| Проверка | Статус |
|----------|--------|
| Import `?v=` ↔ `asset-manifest.js` | ✅ CI |
| Site nav partial ↔ HTML pages | ✅ CI |
| JS syntax (`node --check`) | ✅ CI |
| Unit tests (`tests/*.test.mjs`) | ✅ CI |
| Desktop `/coins` bundled UI | ✅ user |

## Откат

```bash
git fetch --tags
git checkout metka-28   # текущий
git checkout metka-27   # до desktop bundled UI
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `.app` | `/coins` — топбар, графики, рисование |
| Desktop | вход email / paste-link |
| `/` | v0.28 после выбора таймфрейма |
| Vercel | деплой main без регрессии |

## Тег после коммита

```bash
git tag -a metka-28 -m "metka-28: desktop bundled UI working, metka baseline"
```
