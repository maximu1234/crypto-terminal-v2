# Crypto Terminal v2

Мультичарт-терминал для криптовалют (Bybit): скринер, графики, алерты, избранное.

## Страницы

| Страница | URL | Описание |
|----------|-----|----------|
| Главная | `/` (`index.html`) | Скринер 4 / 6 / 9 виджетов, избранное (флаг) |
| Монеты | `/coins` | Свечи, RSI, рисование, алерты на лучах |
| Листинги | `/listings` | USDT-перпетуалы Bybit (`launchTime`, до 365 дн.; «Новые» на Монетах — 7 дн.) |
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
3. Framework: **Other**; build и output — см. `vercel.json` (генерация `supabase-env.js` + корень репозитория).
4. **Deploy**. После пуша в `main` Vercel обновляет сайт автоматически.

Конфиг: `vercel.json` (`cleanUrls` — адреса без `.html`).

**Облачная синхронизация** (избранное + рисунки): [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Перенос с тестовой ветки на production: [docs/PRODUCTION_DEPLOY.md](docs/PRODUCTION_DEPLOY.md).

**После деплоя:** жёсткое обновление в браузере (Cmd+Shift+R), чтобы сбросить кэш скриптов.

## Основные возможности

- **Избранное** — localStorage; с входом по email — синхронизация через Supabase (скринер + монеты).
- **Рисунки** — `drawings_{SYMBOL}` в localStorage; с входом — синхронизация между устройствами.
- **Алерты** — горизонтальный луч → пересечение цены → звук, тост, удаление луча; история на `/alerts`.
- **Coins** — запоминает последнюю монету и ТФ (`coins_page_prefs_v1`).
## Данные

- **Crypto / Новые** — Bybit Linear (REST + WebSocket); «Новые» = 7 дней, страница Листинги = до 365 дней (`js/bybit-listings.js`).
- **Stocks / Commodities / Forex** — Twelve Data через `/api/twelvedata` (ключ только на сервере: `TWELVEDATA_API_KEY` в Vercel / локально в env).

## Структура

```
index.html, coins.html, listings.html, terminal.html, trade-calculator.html
alerts/index.html
screener.html          — редирект
vercel.json, start.sh, .env.example

api/
  bybit.js, twelvedata.js   — прокси на Vercel (ключи не в браузере)

css/                   — common, screener, terminal, dashboard, alerts, trade-calculator, listings
js/
  api.js, twelvedata-fetch.js, chart.js, ws.js, tickers.js, indicators.js, storage.js
  bybit-listings.js    — новые листинги Bybit (launchTime)
  screener.js          — главная
  terminal.js          — монеты
  listings.js          — страница листингов
  dashboard.js         — терминал
  drawings.js          — инструменты на графике
  alerts.js, alert-monitor.js, alert-auth-cache.js, alerts-cloud-sync.js
  alerts-page.js, site-boot.js
sounds/                — cute_msg_alert.mp3 (звук срабатывания)
  trade-calculator.js, symbol-autocomplete.js, draw-ui-shared.js
```

## Версии скриптов и стилей

Единый реестр: **`js/asset-manifest.js`** (объект `ASSETS`).

После правок в manifest:

```bash
node scripts/sync-asset-versions.cjs          # применить версии ко всем js/html
node scripts/sync-asset-versions.cjs bump chart.js   # +1 и sync
node scripts/sync-asset-versions.cjs list     # список
```

`coins-asset-versions.js` — алиасы для boot `/coins` (deprecated, см. `asset-manifest.js`).

Жёсткое обновление в браузере (Cmd+Shift+R) после деплоя.
