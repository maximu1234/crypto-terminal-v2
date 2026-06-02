# BTC Dominance (BTC.D) — архитектура

Тестовая страница: **`/btc-dominance-test.html`** (локально и на Vercel после деплоя).

## Зачем

Доля капитализации Bitcoin от всего крипторынка (%). На Bybit такого инструмента нет — нужен агрегатор (CoinGecko).

## Источники данных

| Приоритет | Источник | Что даёт |
|-----------|----------|----------|
| 1 | **CoinMarketCap Trial** (без ключа) | История `btc_dominance` — 1 запрос |
| 2 | **CoinGecko** top-6 estimate | Fallback: BTC cap / Σ(top6)×scale |
| 3 | **`data/btc-dominance-cache.json`** | Offline fallback при 429 (stale) |
| opt | `COINGECKO_API_KEY` | Точный `/global/market_cap_chart` (PRO) |

## Поток данных

```
btc-dominance-test.html
  └─ js/btc-dominance/test-page.js   — UI + Lightweight Charts (line)
       └─ js/btc-dominance/fetch.js  — HTTP-клиент
            └─ GET /api/coingecko?mode=dominance&days=90

api/coingecko.js (Vercel / dev-server)
  ├─ CoinGecko /global                          → current %
  ├─ CoinGecko /coins/bitcoin/market_chart      → BTC cap history
  └─ total cap: PRO chart ИЛИ top-6 estimate (free)
       └─ dominance[t] = btc_cap / total_cap × 100
       └─ при 429 → data/btc-dominance-cache.json (stale, метка «cache»)
```

## API

| Query | Ответ |
|-------|--------|
| `mode=global` | `{ ok, btcDominance, updatedAt }` |
| `mode=dominance&days=90` | `{ ok, current, points: [{time,value}], days, pointCount, stale? }` |

**days:** `1`, `7`, `14`, `30`, `90`, `180`, `365`, `max`

Кэш CDN: global ~2 мин, history ~3 мин.

## Granularity (CoinGecko free)

| days | ~шаг точек |
|------|------------|
| 1 | ~5 мин |
| 7–90 | ~1 ч |
| 365 / max | ~1 д |

Intraday 15m «как у Bybit» — только через свой snapshot в БД (фаза 2).

## Интеграция на сайт (когда решим)

1. **Виджет** на `/coins` или `/terminal` — макро-панель, TF 1D/1W/1M.
2. **Псевдо-символ `BTC.D`** в `loadSymbol()` — отдельная ветка вместо Bybit.
3. **Алерты** на dominance — позже, если нужны.

## Локально

```bash
./start.sh
# открыть http://127.0.0.1:8080/btc-dominance-test.html
```

Прокси `/api/coingecko` добавлен в `scripts/dev-server.py`.

## Ограничения

- CoinGecko free: rate limit; при 429 API отдаёт **static cache** (~90d, `stale: true`). Обновление: `node scripts/update-btc-dominance-cache.cjs`.
- Число может чуть отличаться от TradingView `CRYPTOCAP:BTC.D` — один источник, не смешивать.
