# Метка 7 — самая рабочая версия (июнь 2026)

**Тег:** `metka-7` · **Коммит:** `git rev-parse metka-7`

**Единственный эталон отката.** Предыдущие метки (`metka-4` … `metka-6`) сняты.

Стабильная сборка Multichart: desktop + iPad, все рынки на `/coins`, рисование (Fib), алерты, cloud sync, terminal dashboard.

## Страницы

| URL | Boot | Prod |
|-----|------|------|
| `/` | `screener.js` + `site-boot.js` | 200 |
| `/coins` | `coins-page-boot.js` → `chart-page.js` → `terminal.js` | 200 |
| `/terminal` | `dashboard.js` | 200 |
| `/alerts` | `alerts-page.js` | 200 |
| `/listings`, `/trade-calculator`, `/system` | page JS + `site-boot.js` | 200 |

## Что работает

### График и UI
- Candlestick + RSI, invert scale, все TF
- Desktop: native LW crosshair
- **iPad `/coins`:** probe crosshair (vert + horiz SVG), dock после отпускания, «+» на шкале
- iPad жесты: hold/dock, dismiss, future area, scale tap/hold, pan/pinch
- Terminal dashboard: throttled history на старте (медленный WiFi)

### Рисование
- Trendline, hray, channel, position, **Fibonacci**
- **Fib:** hit-test по span; при вертикальных/узких якорях (< 12px) уровни **скрыты** (не растягиваются на весь график)
- Touch-рисование (`drawings-tablet-input.js`), единый `tablet-gesture-policy.js`

### Данные и рынки
- **Монеты:** crypto, new, stocks, commodities, forex
- Twelve Data для non-crypto при `TWELVEDATA_API_KEY`
- Bybit kline + ticker streams

### Алерты и cloud
- Local + cloud + Telegram (worker)
- Cloud sync: drawings, favorites, device state
- Без spam 401 при истёкшем JWT
- Auth OTP, system admin

## Полный аудит (2026-06-02)

| Проверка | Результат |
|----------|-----------|
| `node --check` все `.js` (115 файлов, js/ + api/ + alert-worker/) | OK |
| `node scripts/check-asset-manifest.cjs` | OK (104 assets, 136 html/js refs) |
| `node scripts/check-site-nav.cjs` | OK (4 pages, 6 links) |
| `node --test tests/*.test.mjs` | OK (14/14) |
| `npm run check:all` | OK |
| CI `.github/workflows/ci.yml` | те же шаги |
| Prod `crypto-terminal-v2.vercel.app` — основные URL | 200 × 7 |
| iPad crosshair + coins tablet (ручной чеклист) | OK |
| Fib edit: вертикальные якоря | OK |

## Известный техдолг (не блокирует прод)

Подготовленные split-модули **ещё не подключены** к facade; прод использует монолиты:

- `js/alerts-cloud/{…}.js` → `alerts-cloud-sync.js`
- `js/drawings-cloud/{…}.js` → `drawings-cloud-sync.js`
- `js/drawings/{draw-hit,draw-render}.js`, `drawings-tablet-input.js` → wiring в `drawings/init.js` — TODO

На bundle/рантайм не влияют (не импортируются из prod boot).

**Фаза 0 refactor:** [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md), [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md), autotests `tests/draw-hit.test.mjs`.

## Ключевая структура

См. [ARCHITECTURE.md](./ARCHITECTURE.md).

## Откат

```bash
git fetch --tags
git checkout metka-7
```

Выборочно — `git show metka-7 --stat` или paths из ARCHITECTURE.
