# Multichart

Мультичарт для криптовалют: скринер, терминал, вотчлист, алерты, дневник и торговля Bybit. Тот же UI на сайте (Vercel) и в Multichart.app. Живой алгобот и торговля BingX — в приложении.

Текущая подпись: веб `v0.232`, desktop `1.2.16` (`js/release-marker.js`). Карта модулей: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Страницы

| Страница | URL | Вход |
|----------|-----|------|
| Скринер | `/`, `/screener.html` | `js/screener.js` |
| Терминал | `/terminal.html` | `js/terminal-page-boot.js` → `js/terminal.js` |
| Вотчлист | `/watchlist.html` | `js/watchlist.js` |
| Дневник | `/diary/` | `js/trade-diary-page.js` |
| Алерты | `/alerts/` | `js/alerts-page.js` |
| Скрипт | `/script.html` | `js/script-page.js`, тоггл в Системных |
| Алго | `/algo-trading.html` | `js/algo-trading.js`, тоггл; живой бот только в `.app` |
| Листинги | `/listings.html` | `js/listings.js` |
| Калькулятор | `/trade-calculator.html` | `js/trade-calculator.js` |

`/coins` и `/trade` открывают Терминал. Отдельного `coins.html` нет.

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

Desktop: [docs/DESKTOP_APP.md](docs/DESKTOP_APP.md). Торговля: [docs/TRADING_MODULE.md](docs/TRADING_MODULE.md).

## Данные и торговля

- **Bybit** — свечи и тикеры напрямую (REST + WebSocket), запасной путь `/api/bybit`. Приватные ордера на сайте идут через Railway, в `.app` — через IPC.
- **BingX** — публичный рынок через `/api/bingx`. Торговля BingX только в `.app`.
- **Листинги** — USDT-перпетуалы Bybit (`launchTime`, до 365 дней, `js/bybit-listings.js`).
- **Stocks / Commodities / Forex** — Twelve Data через `/api/twelvedata` (ключ только на сервере: `TWELVEDATA_API_KEY`).

## Структура

```
index.html, screener.html, terminal.html, watchlist.html
algo-trading.html, script.html, listings.html, trade-calculator.html
diary/, alerts/, system/
api/                   — Vercel: bybit, bingx, moex, twelvedata, site-gate
js/                    — UI. drawings/ и terminal/ — модули страниц
desktop/               — Electron Multichart
bot-app/               — отдельный Algo Bot
alert-worker/          — Railway: алерты, Telegram, веб-ордера Bybit
```

`js/drawings.js` и `js/terminal-entry.js` — тонкие входы. Рисунки живут в `js/drawings/`, страница Терминала — в `js/terminal/`.

## Версии скриптов и стилей

Единый реестр: **`js/asset-manifest.js`** (объект `ASSETS`).

После правок в manifest:

```bash
node scripts/sync-asset-versions.cjs          # применить версии ко всем js/html
node scripts/sync-asset-versions.cjs bump chart.js   # +1 и sync
node scripts/sync-asset-versions.cjs list     # список
```

Жёсткое обновление в браузере (Cmd+Shift+R) после деплоя.
