# Метка 69 — ордера при открытии/закрытии позиции, RO на графике, алерты 4h (июль 2026)

**Тег:** `metka-69`

## Что вошло

### Торговля (desktop)

- **При открытии позиции:** лонг → отмена Buy-триггеров, Sell → reduce-only; шорт — наоборот (`trade-position-open-orders.js`, `reconcileOrdersOnPositionOpen`).
- **При закрытии позиции:** подстраховка — снятие оставшихся RO-ордеров (`trade-position-close-orders.js`).
- **RO-стопы:** `closeOnTrigger` на Bybit — биржа сама снимает условные стопы без позиции; `reduceOnly` для новых ордеров на закрытие.
- **График:** RO-ордера — оранжевый Sell / тёмно-зелёный Buy, метки `(RO)`; позиционные TP/SL не дублируются на шкале.
- **Авто-SL/TP:** fix после рестарта — dismissed-stops и baseline.

### Алерты

- **4h ложный триггер:** sameBar wick guard, rebaseline при смене TF (браузер + worker).
- Worker: `tf-normalize.js`, тесты cross-alert.

### Рисование

- Общая панель стиля между графиками (в т.ч. RSI); сброс выделения peer при клике по графику.

## Версии

- Web marker: `v0.69`
- Desktop app: `v1.0.63` (Mac + Win: `desktop-v1.0.63`, `desktop-win-v1.0.63`)
