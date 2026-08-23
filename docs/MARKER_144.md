# Метка 144 — MACD-алерты, SOCKS Bybit REST, desktop 1.1.42

**Тег:** `metka-144`

## Что вошло

- **Алерты MACD:** плюс у шкалы, линия, бейдж и drag на панели MACD
  (`source: "macd"`), как у RSI. Срабатывание по линии MACD, в том числе HTF.
- **Воркер:** RSI/MACD не смотрятся в цикле last price (нет ложных $70 / $0.42).
  Telegram: «Цена пересекла RSI» / «Цена пересекла MACD».
- **HTF:** RSI / MACD / SMA-EMA можно считать со старшего ТФ и проецировать
  на график.
- **Desktop SOCKS:** Bybit REST (тикеры и signed) идёт через прокси;
  public WS остаётся напрямую. Keepalive TLS-агента, прогрев пула.
- **Bybit вход:** подсказки по противоположной позиции (hedge) в market entry.

Оригинал Pattern 1-2 math/paint не менялся.

## Версии

- Web marker: `v0.144`
- Multichart desktop app: `v1.1.42`
