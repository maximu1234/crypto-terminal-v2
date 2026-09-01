# Метка 157 — SOCKS public WS, фильтр объёма, гейты desktop IPC

**Тег:** `metka-157`

## Что вошло

- **Кафе / SOCKS5:** тики и торговый Bybit идут через SOCKS; история свечей
  остаётся напрямую на `api.bybit.com` (Chromium bypass).
- **Публичный Bybit WS в main:** хаб `kline`/`tickers` через IPC, чтобы кафе-прокси
  не вешал Chromium `WebSocket`. Список тикеров и last price графика — через
  этот хаб, без гонки REST в рендерере.
- **Скринер:** фильтр «Объём ≥» по 24h USDT turnover.
- **Терминал:** план вьюпорта при смене ТФ без `autoscaleInfoProvider` на свечах;
  совпадение символа оверлея TP/SL с суффиксом `.P`.
- **Desktop IPC:** доверенный UI только по origin локального сайта; трей,
  избранное Скрипта и логотип скриншота за `handleTrustedDesktopUi`. Скрипт/алго
  не грузятся в публичный веб; CORS session-log не отражает чужой Origin.

Оригинал Pattern 1-2 не менялся.

## Версии

- Web marker: `v0.157`
- Multichart desktop app: `v1.1.56`
