# Метка 74 — изоляция дневника и стабильная торговля BingX (июль 2026)

**Тег:** `metka-74`

## Что вошло

### Дневник и история сделок

- Bybit и BingX получили независимые модули `diary/*` и `history/*`.
- Общие `trade-diary-*` и `trade-markers-sandbox/trade-fetch.js` стали тонкими
  фасадами без биржевой бизнес-логики.
- Исправлены side, duration, комиссии и маркеры длинных сделок.
- Прошлые дни BingX сохраняются в day-cache; повторно проверяется только сегодня.

### Торговля BingX

- Быстрые optimistic open/close и автоматическая постановка SL/TP.
- SL/TP используют `CONTRACT_PRICE`, совпадающий с ценой свечей на графике.
- Private WS и резервный poll быстро подхватывают сделки, открытые или закрытые
  непосредственно на BingX.
- Позиции и stop-orders публикуются одним согласованным snapshot: линии не
  мигают, а отменённые на бирже SL/TP удаляются после свежего openOrders.
- Critical place/close/setStop не ждут фоновые запросы в BingX scheduler.

### Bybit

- Восстановлен корректный open-time для долгих позиций: executions ищутся до
  180 дней с привязкой к `avgEntryPrice`.
- Изменения BingX не используются модулем Bybit.

### Изоляция

- Дневник, история и runtime торговли полностью разделены по биржам.
- Shared renderer-файлы содержат только маршрутизацию и UI-host.
- Расширены тесты cross-import и thin-facade границ.

## Версии

- Web marker: `v0.74`
- Desktop app: `v1.0.68`
- Mac tag: `desktop-v1.0.68`
- Windows tag: `desktop-win-v1.0.68`
