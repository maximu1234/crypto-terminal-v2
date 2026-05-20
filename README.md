# Crypto Terminal v2

Мультичарт-терминал для криптовалют (Bybit): скринер, графики, алерты, избранное.

## Страницы

| Страница | URL | Описание |
|----------|-----|----------|
| Главная | `/` (`index.html`) | Скринер 4 / 6 / 9 виджетов, избранное (флаг) |
| Монеты | `/coins` | Свечи, RSI, рисование, алерты на лучах |
| Терминал | `/terminal` | Дашборд виджетов 4 / 6 / 9 |
| Алерты | `/alerts` | Активные и история (30 последних) |
| Калькулятор | `/trade-calculator` | Размер позиции по риску и стопу |

`screener.html` — редирект на главную (старые ссылки).

## Локальный запуск

```bash
./start.sh
```

Откройте **http://127.0.0.1:8080/** (не `file://` — иначе модули и API не работают).

## Деплой на Vercel

1. Репозиторий на GitHub (ветка `main`).
2. [vercel.com](https://vercel.com) → **Add Project** → импорт репозитория.
3. Framework: **Other**, build command пустой, output — корень репозитория.
4. **Deploy**. После пуша в `main` Vercel обновляет сайт автоматически.

Конфиг: `vercel.json` (`cleanUrls` — адреса без `.html`).

**После деплоя:** жёсткое обновление в браузере (Cmd+Shift+R), чтобы сбросить кэш скриптов.

## Основные возможности

- **Избранное** — один список `favorites` в localStorage (скринер + монеты).
- **Алерты** — горизонтальный луч → пересечение цены → звук, тост, удаление луча; история на `/alerts`.
- **Coins** — запоминает последнюю монету и ТФ (`coins_page_prefs_v1`).
- **Рисунки** — `drawings_{SYMBOL}` в localStorage.

## Данные

- **Crypto / New** — Bybit Linear (REST + WebSocket).
- **Stocks / Commodities / Forex** — Twelve Data (ключ в `js/api.js`).

## Структура

```
index.html, coins.html, terminal.html, trade-calculator.html
alerts/index.html
screener.html          — редирект
vercel.json, start.sh

css/                   — common, screener, terminal, dashboard, alerts, trade-calculator
js/
  api.js, chart.js, ws.js, tickers.js, indicators.js, storage.js
  screener.js          — главная
  terminal.js          — монеты
  dashboard.js         — терминал
  drawings.js          — инструменты на графике
  alerts.js, alert-monitor.js, alerts-page.js, site-boot.js
  trade-calculator.js, symbol-autocomplete.js, draw-ui-shared.js
```

## Версии скриптов

В HTML указаны `?v=…` для сброса кэша после обновлений. При правках увеличивайте номер у изменённого файла.
