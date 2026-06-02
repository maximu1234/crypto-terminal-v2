# Метка 5 — стабильный эталон Multichart (июнь 2026)

**Тег:** `metka-5` · **Коммит:** `git rev-parse metka-5`

Единая точка отката после метки 4. Включает исправления auth/cloud, Fib hit-test, оптимизацию Terminal на медленном WiFi, **все рынки на странице Монеты** (Crypto / Новые / Акции / Сырьё / Forex).

Предыдущий эталон: [MARKER_4.md](./MARKER_4.md) (`metka-4`).

## Страницы

| URL | Boot |
|-----|------|
| `/` | `screener.js` + `site-boot.js` |
| `/coins` | `coins-page-boot.js` → `chart-page.js` → `terminal.js` |
| `/terminal` | `dashboard.js` |
| `/alerts` | `alerts-page.js` |
| `/listings`, `/trade-calculator`, `/system` | page JS + `site-boot.js` |

## Что работает (с метки 4 + новое)

- График (desktop + iPad), RSI, invert scale
- Рисование incl. **Fibonacci** (hit-test по горизонтальному span уровня)
- Алерты local + cloud + Telegram (worker)
- Cloud sync drawings / favorites / device state (без spam 401 при истёкшем JWT)
- Auth OTP, system admin
- **Монеты — все типы рынка:** crypto, new, stocks, commodities, forex (Twelve Data для графиков non-crypto при `TWELVEDATA_API_KEY`)
- Terminal dashboard: меньше параллельных history-запросов на старте (cafe WiFi)

## Аудит (2026-06-02)

| Проверка | Результат |
|----------|-----------|
| `node --check` все `.js` (js/, api/, alert-worker/) | OK |
| `node scripts/check-asset-manifest.cjs` | OK (103 assets) |
| `node scripts/check-site-nav.cjs` | OK |
| `node --test tests/*.test.mjs` | OK (5/5) |
| CI `.github/workflows/ci.yml` | те же шаги |

## Известный техдолг (не в рантайме)

Подготовленные split-модули **ещё не подключены** к facade-файлам; прод использует монолиты `alerts-cloud-sync.js`, `drawings-cloud-sync.js`, inline-код в `drawings/init.js`:

- `js/alerts-cloud/{debug,telegram-id,worker-client,registry-sync,polling-realtime}.js`
- `js/drawings-cloud/{worker-client,pull-reconcile,sync-lifecycle}.js`
- `js/drawings/{draw-hit,draw-render}.js`, `js/drawings-tablet-input.js`

Удалять не следует до wiring — иначе потеряется подготовленный refactor. На bundle/рантайм не влияют (не импортируются).

## Ключевая структура

См. [ARCHITECTURE.md](./ARCHITECTURE.md).

## Откат

```bash
git checkout metka-5
```

Выборочно — `git log metka-4..metka-5` или paths из ARCHITECTURE.
