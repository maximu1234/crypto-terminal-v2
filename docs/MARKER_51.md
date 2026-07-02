# Метка 51 — BingX, биржевой слой, worker egress, UX (июль 2026)

**Тег:** `metka-51` · **Веб:** `v0.51` · **Desktop:** `desktop-v1.0.45` → `v1.0.45`

**Предыдущий эталон:** [MARKER_50.md](./MARKER_50.md) (`metka-50` / `desktop-v1.0.44`).

## Релиз

| Компонент | Описание |
|-----------|----------|
| Alert worker | Incremental reload: probe `count` + `max(updated_at)` вместо full scan каждые 3 с |
| Биржи | Общий слой `market-api` / `market-ws` / `js/exchanges/*`; BingX REST через `/api/bingx` |
| Алерты | `exchange_id` в `price_alerts`; миграция `migration-price-alerts-exchange-id.sql` |
| Торговля | Настройки бирж в app-settings; панель trading settings; order labels SST/SLT в книге |
| График /trade | Veil при смене монеты — позиции/ордера без мигания; полные подписи на чарте |
| Рисование | Первый якорь на `pointerdown` (rectangle, trendline, fib, channel, arrow) |
| Watchlist | HUD текущей цены на виджетах |
| Desktop | BingX proxy в `local-site-server`; bundle sync |

## Supabase SQL (если ещё не применено)

`supabase/migration-price-alerts-exchange-id.sql`

## Desktop DMG

1. Push `main`.
2. GitHub → **Actions** → **Desktop release (macOS)** → **Run workflow**.
3. Поле `desktop_version`: **`1.0.45`**.
4. Дождаться зелёного run → **Releases** → **Desktop 1.0.45**.

## Railway

Redeploy `alert-worker` после push (incremental reload).

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Worker | `alert-worker/lib/alerts-db.js`, `alert-worker/lib/supabase-rest.js` |
| Биржи | `js/market-api.js`, `js/exchanges/`, `api/bingx.js` |
| Trade | `js/trade-exchange-settings.js`, `js/trade-chart-overlay.js` |
| Рисование | `js/drawings/draw-placement.js`, `js/drawings/init.js` |
| `release-marker.js` | METKA 51 / desktop 1.0.45 |
