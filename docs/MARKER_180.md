# Метка 180 — hotfix: MACD engine require в live-боте

**Тег:** `metka-180`

## Что вошло

- **Fix:** в `algo-trading-bot.cjs` (desktop + bot-app) не было
  `require` для `macdFlipTouchEngine` / `macdFlipTouchMath` и импорта
  книги MACD из store. Из‑за этого `buildStatusSnapshot` / старт RSI
  падали с `macdFlipTouchEngine is not defined`.

## Версии

- Web marker: `v0.180`
- Multichart desktop app: `v1.1.79`
- Algo Bot (Windows): `v1.0.173`
