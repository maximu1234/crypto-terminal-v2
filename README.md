# Crypto Terminal v2

Мультичарт-терминал для криптовалют (Bybit) с дашбордом виджетов и отдельной страницей терминала.

## Страницы

- **index.html** — дашборд с сеткой 4 / 6 / 9 графиков, сохранение символа и таймфрейма в `localStorage`
- **coins.html** — терминал: свечной график, RSI, список монет, избранное, фильтры рынков

## Запуск локально

```bash
python3 -m http.server 8080
```

Откройте http://localhost:8080

## Деплой

Проект настроен под [Vercel](https://vercel.com) (`vercel.json` с `cleanUrls`).

## Данные

- **Crypto / New** — Bybit Linear (REST + WebSocket)
- **Stocks / Commodities / Forex** — Twelve Data (ключ в `js/api.js`)

## Структура

```
css/          — стили
js/
  api.js      — загрузка истории и списка инструментов
  chart.js    — создание графиков Lightweight Charts
  dashboard.js
  terminal.js
  ws.js       — realtime свечи
  tickers.js  — обновление цен в списке
  storage.js  — localStorage
  indicators.js
```
