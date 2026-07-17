# Метка 73 — BingX дневник/маркеры по positionSide (июль 2026)

**Тег:** `metka-73`

## Что вошло

### BingX closed trades — без угадывания Long/Short

- Источник правды: `positionHistory`, а если пусто (типично для старых one-way) —
  циклы из `allFillOrders.positionSide` (`LONG`/`SHORT`).
- `matchBingxRoundTripByAnchor`: матч по close, open или окну open→close
  (income часто на open).
- Удалены chronology-хелперы (`pairChronologicalRoundTrip`,
  `pairBingxRoundTripFromFills`).
- Пустой `side` больше не становится Long (UI «—», маркеры без стороны).

### Дневник

- Стабильный ключ строки: `listCloseTimeMs` + `orderId` (enrich не ломает DOM).
- Detail/chart берут сторону из resolved PH / positionSide fills.
- В таблице исполнений — дата+время.

### Rate limit / stream

- `bingx-request-scheduler.cjs` для signed REST.
- Renderer stream: snapshot IPC, без periodic REST poll.

### Изоляция

- Политика Terminal closed-PnL fetch — флаги в `js/trade/{bybit,bingx}/config.js`,
  не `if (bingx)` в shared `trade-fetch.js`.
- Тесты isolation + positionSide short cycle.

## Версии

- Web marker: `v0.73`
- Desktop app: `v1.0.67`
- Mac tag: `desktop-v1.0.67`
- Windows tag: `desktop-win-v1.0.67`
