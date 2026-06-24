# Метка 41 — RSI draw, W TF, trade leverage, layout polish (июнь 2026)

**Тег:** `metka-41` · **Desktop:** `desktop-v1.0.33` (DMG)

**Текущий эталон отката.** Предыдущий: [MARKER_40.md](./MARKER_40.md) (`metka-40` / `desktop-v1.0.32`).

Проверено: `npm run check:all`, `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/terminal`: trade boot только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| `body.trade-page` только desktop | ✅ |
| Trade init — lazy `trade-desktop-boot` / gate `isDesktop` | ✅ |
| Bybit private WS / trading IPC — только Electron main | ✅ |
| Leverage UI — desktop gate через `trade-leverage-settings` | ✅ |

## Что вошло после metka-40

### Терминал — график и layout

| Компонент | Описание |
|-----------|----------|
| RSI рисование | Отдельный слой на `#rsi-wrap`; переключение панели; clear-all с главного графика |
| Алерты на RSI | `drawPriceAlerts: false` — нет ложной пунктирной линии алерта внизу RSI |
| W (неделя) | TF + hotkey `7` на Terminal, Screener, Watchlist, Diary, worker |
| AO / Volume resize | Ручка высоты AO; лимиты 50%–200% для AO и Volume |
| Позиции в списке | Жёлтая пунктирная обводка вместо оранжевого фона |

### Desktop only — торговля

| Компонент | Описание |
|-----------|----------|
| Leverage & margin | Cross/Isolated + плечо Bybit после volume presets |
| Trade book | Скрытие итогового PnL (глаз); компактнее строки; `min-height` 106px |
| Draw edit | Фикс прыжка хэндлов TP/SL при drag long/short |
| Cloud auth | Меньше мерцания гостя и пропажи рисунков при логине |

### Скринер / общее

| Компонент | Описание |
|-----------|----------|
| Поиск монеты | `mountQwertyKeyInput` — латиница при любой раскладке (как на Терминале) |
| Qwerty input | `input` event после keydown/paste для автодополнения |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=41, desktop=1.0.33 |
| `trade-book-panel.js` | 27 |
| `drawings/init.js` | 117 |
| `terminal.js` | 340+ |
| `trade-leverage-settings.js` | new |
| `desktop/package.json` | 1.0.33 |

## Откат

```bash
git fetch --tags
git checkout metka-41   # текущий
git checkout metka-40   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `/terminal` | Рисование на RSI; алерт только на ценовом графике |
| Desktop | W в TF; resize AO/Volume |
| Desktop | Leverage dropdown; Cross/Isolated |
| Desktop | Trade book: eye PnL, min-height панели |
| Screener | Поиск: русская раскладка → латиница |
| Desktop Dock | v0.41 / v1.0.33 |

## Теги

```bash
git tag -a metka-41 -m "metka-41: RSI draw, W TF, leverage, layout polish"
git tag -a desktop-v1.0.33 -m "desktop-v1.0.33: bundled UI metka-41"
```
