# Метка 54 — страница «Скрипт» (desktop, июль 2026)

**Тег:** `metka-54` · **Веб:** `v0.54` · **Desktop:** `v1.0.47`

**Предыдущий эталон:** [MARKER_53.md](./MARKER_53.md) (`metka-53` / `desktop-v1.0.46`).

## Зачем

Отдельная страница **Скрипт** (`/script.html`) для сканера паттерна **1-2, 1-2**: полный скан по ТФ, авто-обновление в фоне, график как на Терминале. Только **desktop .app** (как торговый блок).

## Состояние

| Компонент | Описание |
|-----------|----------|
| Маршрут | `/script.html` — редирект на Скринер вне desktop |
| Навигация | Пункт «Скрипт» монтируется `script-desktop-nav.js` только в .app |
| Сканер | `pattern-12-scanner.js`, результаты в `localStorage` |
| Фон | `script-scan-background.js` — таймер авто-скана между страницами |
| График | `terminal-screener-chart-pane` (coins viewport, RSI, whitespace, linked crosshair) |
| Паттерн | Overlay 1-2 на графике по умолчанию |
| UX | ТФ над графиком, ↗ в Терминал, клавиши: список (Space/↑/↓), ТФ (1–7) |
| Терминал | Убран временный dropdown-сканер; fix `terminal-state` v8 (список монет) |

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Страница | `script.html`, `css/script-page.css`, `js/script-page*.js` |
| Сканер | `js/pattern-12-scanner.js`, `js/pattern-scan-results.js`, `js/script-scan-background.js` |
| График | `js/terminal-screener-chart-pane.js`, `js/script-page-chart.js` |
| Nav / boot | `js/script-desktop-nav.js`, `js/site-boot.js`, `js/page-routes.js` |
| `release-marker.js` | METKA 54, desktop 1.0.47 |

## Откат

```bash
git checkout metka-54
```
