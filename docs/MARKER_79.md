# Метка 79 — BingX Share, tray PnL, стакан USDT (июль 2026)

**Тег:** `metka-79`

## Что вошло

### BingX PnL Share

- Шаблоны карточек Share для BingX (открытая позиция и дневник).
- Генератор `scripts/generate-bingx-pnl-card.py`; Mac/Win wiring через
  активную биржу в `pnl-share-card*.cjs`.
- Модалка BingX всегда wide (формат дневника).
- В дневнике убран дубль иконки Share у абсолютного PnL (Bybit + BingX).

### Menu-bar tray PnL

- Нереализованный PnL в tray считается как в Терминале (mark-based),
  а не из устаревшего stream `pnl` (`menu-bar-tray-pnl.cjs` + REST-first feed).

### Scalping DOM

- Тики цен по сетке 1/2/5×10ⁿ; объёмы в USDT (price × size).

### Плашки на шкале цен

- Trade-плашки `pinToPrice: true` — не сдвигаются collision-layout при зуме.

### CI

- `npm run test:ci-parity` — unit-тесты без `desktop/node_modules`, чтобы
  локальный `check:all` ловил Electron-require до первого пуша.

## Версии

- Web marker: `v0.79`
- Desktop app: `v1.0.73`
- Mac tag: `desktop-v1.0.73`
- Windows tag: `desktop-win-v1.0.73`
