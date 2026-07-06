# Метка 55 — Скрипт: сетка виджетов, паттерн 1-2, crosshair (июль 2026)

**Тег:** `metka-55` · **Веб:** `v0.55` · **Desktop:** `v1.0.48`

**Предыдущий эталон:** [MARKER_54.md](./MARKER_54.md) (`metka-54` / `desktop-v1.0.47`).

## Зачем

Страница **Скрипт** — сетка виджетов как в Скринере (по одному на сетап сканера), доработка паттерна **1-2** и фонового скана; на **Терминале** — исправление «залипшего» перекрестия при смене монеты.

## Состояние

| Компонент | Описание |
|-----------|----------|
| Скрипт | Сетка виджетов `script-page-widgets.js`; раскладки, горячие клавиши, фильтр ТФ |
| Сканер | Улучшен `script-scan-background.js` — авто-скан между страницами |
| Терминал | Статус авто-скана в шапке (`script-terminal-status.js`, desktop) |
| Паттерн 1-2 | Математика/отрисовка, окно настроек индикатора |
| Crosshair | Живое отслеживание курсора на `document`; нет фантома при смене символа |
| RSI | Классическая панель `rsi-pane.js` (без эксперимента дивергенции) |
| Рисование | Позиция на шкале цены (`drawings/position.js`) |
| Изоляция | Правила торговли и Скрипта — только desktop |

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Скрипт | `js/script-page.js`, `js/script-page-widgets.js`, `js/script-scan-background.js` |
| Crosshair | `js/chart/chart-factory.js`, `js/terminal.js` |
| Паттерн | `js/indicators/pattern-12*.js`, `js/indicators/indicator-settings-dialog.js` |
| Рисование | `js/drawings/position.js`, `js/drawings/draw-price-scale.js` |
| `release-marker.js` | METKA 55, desktop 1.0.48 |

## Откат

```bash
git checkout metka-55
```
