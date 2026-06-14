# Метка 20 — рабочая версия (июнь 2026)

**Тег:** `metka-20` · **Коммит:** `git rev-parse metka-20`

**Текущий эталон отката.** Предыдущая: [MARKER_19.md](./MARKER_19.md) (`metka-19`).

Проверено: asset manifest (0 mismatches, python audit); site-nav; unit tests — см. список ниже.

## Что добавлено после metka-19

### Фон сайта и графиков — раздельно
- `--app-bg` `#16181f` — фон сайта (body, шапки, списки)
- `--app-chart-bg` `#141721` — фон LW-графиков, RSI, screener/dashboard widgets
- `getChartLayoutBgColor()` в `chart-options.js` — LW читает `--app-chart-bg`

### Монеты — цвета и список
- Свечи: зелёный `#459782` (`chart-factory.js`)
- Положительные % в таблице: `#459782` (классы `coin-change-pos` / `coin-change-neg`, не `.green`)
- Список: шрифт 12px, межстрочный интервал плотнее (padding 5px)

### Терминал — crosshair и алерты в виджетах
- `mountDashboardChartInteractions()` — DOM-перекрестье + `mountPriceAlertUi` на каждый виджет
- Стили «+» алерта в `dashboard.css`

### RSI
- Зона 30–70: `#1e1e31` (`#rsi-band`)
- Уровни 30 / 50 / 70: DOM-пунктир (не LW priceLine)
- Линия 50: на 30% прозрачнее (opacity 0.385 vs 0.55)

### CI / manifest
- Синхронизированы `?v=` во всех HTML после смены CSS

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 5 |
| `screener.js` | 71 |
| `terminal.js` | 302 |
| `dashboard.js` | 81 |
| `chart-widget-host.js` | 9 |
| `chart.js` | 138 |
| `chart/chart-factory.js` | 28 |
| `chart/chart-options.js` | 5 |
| `chart-import.js` | 30 |
| `terminal/coins-table.js` | 10 |
| `drawings/init.js` | 65 |
| `asset-manifest.js` | 2 |
| `critical-shell.css` | 5 |
| `common.css` | 27 |
| `terminal.css` | 131 |
| `dashboard.css` | 38 |
| `coins.css` | 39 |
| `screener.css` | 29 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-14)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK |
| Site nav | OK — 7 ссылок |
| Unit tests | `chart-ruler`, `draw-magnet`, `scale-label-layout`, `draw-hit`, `fib-spec`, `drawings-cloud-shapes`, `position-sizing`, `page-routes`, `coins-layout-resize` |
| Фон | OK — site `#16181f`, charts `#141721` |
| Coins list | OK — `#459782`, 12px |
| Terminal widgets | OK — crosshair + «+» алерт |
| RSI levels | OK — DOM dashed 30/50/70 |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener + **v0.20** + nav OK |
| `/coins` | `coins.html` | chart + RSI + list + drawings |
| `/terminal` | `terminal.html` | widgets + alerts + crosshair |
| `/alerts` | `alerts/index.html` | alerts UI + cloud |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | kline stats |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin |
| `/btc-d` | `btc-d.html` | BTC.D |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| `/` | Подпись **v0.20**; screener grid; фон site vs chart |
| `/coins` | Свечи `#459782`; % в списке; RSI пунктир |
| `/terminal` | Перекрестье; «+» алерт на виджете |
| Nav pages | 7 ссылок в шапке |

## Метки в репозитории

Только **две** git-метки:

| Тег | Роль |
|-----|------|
| `metka-20` | **Текущий** эталон |
| `metka-19` | **Предыдущий** эталон |

`metka-18` и старее — удалены.

## Откат

```bash
git fetch --tags
git checkout metka-20   # текущий эталон (перед экспериментами с Главной)
git checkout metka-19   # до разделения фона / RSI DOM / terminal alerts
```

## Следующий шаг

- Эксперименты с **Главной** (`index.html` / screener) — откат на `metka-20` при необходимости
