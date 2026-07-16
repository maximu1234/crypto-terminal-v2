# Метка 71 — BingX торговля, быстрый sync, дневник (июль 2026)

**Тег:** `metka-71`

## Что вошло

### BingX — торговый модуль (desktop)

- `bingx-rest.cjs`, `bingx-trading-stream.cjs`, `bingx-private-ws.cjs` — отдельный стек, **без импорта** `bybit-rest.cjs`.
- `trading-router.cjs` / `trading-stream.cjs` — маршрутизация по активной бирже; Bybit и BingX изолированы.
- Политики UI: `js/trade/exchanges/bybit-trade-policy.js` / `bingx-trade-policy.js`.
- Позиции, ордера, SL/TP, триггеры — быстрый WS + REST fallback (`forceRefresh`, кэш 2 с).
- Закрытие позиции: tombstone «недавно закрыто», без ghost после stale REST.

### Bybit — без регрессий

- `bybit-rest.cjs` / `bybit-trading-stream.cjs` не импортируют BingX-модули.
- Смена биржи: `restartExchangeTrading()` в `exchange-trading-gate.js`.

### Дневник (desktop)

- Инкрементальная загрузка: day-cache прошлых дней + только новые сделки за сегодня.
- `trade-diary-storage.js` — кэш по биржам.

### Алерты / рынки

- Alert-worker: BingX kline/ticker hubs, deep-link `exchange=`.
- Публичные рынки BingX в `js/exchanges/bingx/*`.

### Фиксы торговли

- `getAutoStopSettings`, `upsertStreamPosition`, `listCachedPositionsForSymbol` — missing imports.
- Закрытие позиции в приложении без ошибки и без «призрака» на графике.

## Версии

- Web marker: `v0.71`
- Desktop app: `v1.0.65` (Mac: `desktop-v1.0.65`, Win: `desktop-win-v1.0.65`)
