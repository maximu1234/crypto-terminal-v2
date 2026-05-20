# Crypto Terminal v2

Мультичарт-терминал для криптовалют (Bybit) с сеткой скринера, дашбордом виджетов и страницей списка монет.

## Страницы

- **index.html** — главная: сетка скринера 4 / 6 / 9, сортировка и таймфрейм
- **coins.html** — монеты: свечной график, RSI, список, избранное, фильтры рынков
- **terminal.html** — терминал: дашборд с сеткой 4 / 6 / 9 виджетов, сохранение символа и ТФ в `localStorage`
- **alerts/** — список алертов по горизонтальным лучам
- **trade-calculator.html** — калькулятор суммы входа по риску и проценту стоп-лосса

Старый адрес **screener.html** перенаправляет на главную.

## Запуск локально

```bash
./start.sh
```

или:

```bash
python3 -m http.server 8080
```

Откройте http://localhost:8080 (в `start.sh` по умолчанию порт **8080**).

## Деплой

Проект настроен под [Vercel](https://vercel.com) (`vercel.json` с `cleanUrls`).

## Данные

- **Crypto / New** — Bybit Linear (REST + WebSocket)
- **Stocks / Commodities / Forex** — Twelve Data (ключ в `js/api.js`)

## Структура

```
css/          — стили
js/
  api.js       — загрузка истории и списка инструментов
  chart.js     — графики Lightweight Charts
  dashboard.js — виджеты (terminal.html)
  screener.js  — главная сетка (index.html)
  terminal.js  — монеты (coins.html)
  drawings.js  — лучи, фибо, каналы (графики)
  alerts.js    — алерты (синхронизация с графиком)
  ws.js        — realtime свечи Bybit
  tickers.js   — опрос тикеров для списка / скринера
  trade-calculator.js — страница калькулятора
  storage.js
  indicators.js
```
