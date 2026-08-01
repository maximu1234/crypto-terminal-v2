# Метка 116 — откат перед arm (Данные + бот) (август 2026)

**Тег:** `metka-116`

## Что вошло

### Откат перед arm (временный фильтр)

После обнаружения pt4 вход не вооружается, пока цена не откатится к pt3 на N%
от X (лог-высота pt4→pt3, как у СЛ). Вход остаётся **первым** пересечением pt4
после отката. Если pt4 заколот до отката — сетап отменяется (`pt4_before_pullback`),
второго шанса нет.

- Модуль: `js/algo-trading/temp-pullback-before-arm.js` (легко снять по маркеру
  `TEMP_PULLBACK_BEFORE_ARM`).
- **Данные:** настройка в 4-й колонке (чекбокс + %, default 38.2, выкл = старое
  поведение) — общая для всех стратегий аналитики.
- **Бот:** та же опция **отдельно** в Стратегиях 1/2/3; live-engine ждёт откат
  перед триггером/алертом; watchlist «По критериям» учитывает фильтр.
- Зеркало в `bot-app/` (UI + trading).

### Сопутствующее

- Экспорт оригинала индикатора Pattern 1-2 в папку `Pattern-12-1-2/` (копия,
  оригинал `js/indicators/pattern-12*` не тронут).
- Уточнение `getOpenOrders` с `symbol` в алго chart-orders; правки order-executor /
  Bybit REST под устойчивую постановку/сверку ТП.

### Hotfix Algo Bot 1.0.123

- 1.0.122: в site-bundle не хватало `pattern-ema-filter.js`.
- 1.0.123: устаревший `htf-loader.js` без `aggregateCandlesToTf` (нужен EMA-фильтру).

## Версии

- Web marker: `v0.116`
- Multichart desktop app: `v1.1.14`
- Mac tag (Multichart): `desktop-v1.1.14`
- Windows tag (Multichart): `desktop-win-v1.1.14`
- Algo Bot desktop app: `v1.0.123`
- Mac tag (Algo Bot): `algo-bot-v1.0.123`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.123`
