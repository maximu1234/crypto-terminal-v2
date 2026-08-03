# Метка 119 — Multi-TP allocation + trail SL retry (август 2026)

**Тег:** `metka-119`

## Что вошло

### Algo Bot: частичные TP и трейлинг

- **Multi-TP:** при мелком `qtyStep` ранние ноги больше не схлопываются в один полный последний TP
  (`0.003 @ 0.001`, 25/25/50 → `[0.001, 0.001, 0.001]` вместо `[0, 0, 0.003]`).
- **Trail SL:** после неудачного amend стопа `tpsHit` не двигается — следующий тик повторяет сдвиг SL.
- **initialQty** не сжимается до live-размера после выставления TP (иначе счётчик hit застревал).
- **tpQtys** сохраняются в `pendingEntries` после входа.
- `countTpsHitByClosedQty` пропускает нулевые ноги, не отбрасывая весь `tpQtys`.

Файлы: `desktop/trading/algo-bot-order-executor.cjs`, `bot-app/trading/algo-bot-order-executor.cjs`
(+ тесты).

## Версии

- Web marker: `v0.119`
- Multichart desktop app: `v1.1.19`
- Mac tag (Multichart): `desktop-v1.1.19`
- Windows tag (Multichart): `desktop-win-v1.1.19`
- Algo Bot desktop app: `v1.0.127`
- Mac tag (Algo Bot): `algo-bot-v1.0.127`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.127`
