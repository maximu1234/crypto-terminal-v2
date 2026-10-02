# Метка 185 — chrome motion app-wide + alerts boot fix

**Тег:** `metka-185`  
**Откат инициативы:** `metka-181`

## Что вошло

- `chrome-motion.css` на Вотчлист / Алго / Дневник / Алерты / и др.
- Boot splash: Вотчлист + АлгоТрейдинг.
- Motion: PnL share (Bybit/BingX), confirm «закрыть все», algo diary modal.
- **Fix:** alerts cloud sync больше не в `requestIdleCallback` на Терминале —
  стартует сразу; idle только для favorites cloud.

## Версии

- Web marker: `v0.185`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
