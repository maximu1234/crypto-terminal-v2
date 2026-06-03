# Метка 12 — рабочая версия (июнь 2026)

**Тег:** `metka-12` · **Коммит:** `git rev-parse metka-12`

**Текущий эталон отката.** Наследует [MARKER_11.md](./MARKER_11.md).

Проверено: `check:all` OK; **Монеты** / **Терминал** / **Главная** — графики, крест, список монет; prod после деплоя `main` @ `dbf686b`.

## Что добавлено после metka-11

### BTC.D (отдельная страница)
- `/btc-d.html` — TradingView CRYPTOCAP:BTC.D, общая шапка сайта
- Ссылка **BTC.D** на `coins.html` (десктоп — в меню; мобилка — над фильтром)
- `btc-dominance-test.html` — dev-страница (TV + Multichart API)
- Без встраивания TV в область графика Монет (откат индексов в `#chart-wrap`)

### Производительность Терминал vs Главная
- Терминал: 2 батча истории, параллельная загрузка виджетов (без stagger на prod)
- **Фаза 2:** `initDrawings` после свечей, очередь по `requestIdleCallback`
- `preloadTradingSymbols` отложен (idle)

### Крест (desktop / Монеты)
- Обе линии **DOM** (штрих 5+4 px), LW-линии скрыты (`mainChartCrosshairOptions`)
- `pointermove` на `#chart-wrap` — без отставания от мыши
- Исправления: `chartR`, `labelX` / `snappedLabelX`, `TABLET_LW_NATIVE_PRICE_SCALE` import
- Все импорты `chart/*` с `?v=` (нет stale `chart-factory.js` без версии)

### UI — список монет
- Шапка **24h / 1h** выровнена со строками (скролл на `#list`, sticky `#table-header`)
- Убрано «висящее» **BTC.D** в таблице (`position:absolute` → пункт меню)

### Прочее
- `/system` — маршрут Bybit (localStorage, per-browser)
- `scripts/dev-server.py`, `start.sh` — локальный `/api/bybit`, ссылки BTC.D
- Supabase usage prefs (system admin) — без изменения prod-графиков

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `chart.js` | 122 |
| `chart/chart-factory.js` | 8 |
| `chart/chart-dom-crosshair.js` | 10 |
| `chart-import.js` | 14 |
| `terminal.js` | 267 |
| `dashboard.js` | 76 |
| `terminal.css` | 101 |
| `coins.css` | 23 |
| `drawings/init.js` | 29 |
| `drawings-cloud-sync.js` | 41 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит (2026-06-03)

| Проверка | Результат |
|----------|-----------|
| `node scripts/pre-refactor-check.cjs` (`check:all`) | OK |
| Syntax check (все `.js`) | OK |
| Asset manifest + site nav | OK |
| Unit tests | 14/14 |
| Нет unversioned `chart-factory` / `chart-dom-crosshair` в `chart.js` | OK |
| `chart.js` import `TABLET_LW_NATIVE_PRICE_SCALE` для tablet scale | OK |

### Ручной smoke (после деплоя)

| Страница | Что проверить |
|----------|----------------|
| Главная | 9 виджетов, быстрый старт |
| Монеты | график, крест (обе линии dashed), 24h/1h заголовки, нет ошибок в консоли |
| Терминал | 9 виджетов, рисунки после свечей |
| `/btc-d.html` | TV-виджет |
| `/system` | маршрут Bybit (опционально) |

### Известные ограничения (не блокер метки)

- Прямой `api.bybit.com` может падать по сети/CERT — fallback proxy/worker; красные строки в консоли возможны
- Маршрут Bybit в **Авто**: Chrome → proxy, Safari → direct (см. `/system`)
- CI warning Node 20 deprecation в GitHub Actions — до июня 2026 не критично
- Фаза 4 refactor: split `alerts-cloud-sync.js` — не начата

## Откат

```bash
git fetch --tags
git checkout metka-12   # текущий эталон (рабочая версия)
git checkout metka-11   # до BTC.D / crosshair / terminal load
git checkout metka-10   # после split drawings-cloud
```

## Следующий шаг

- Фаза 4 alerts-cloud **или** стабилизация Bybit 403 на Railway/Vercel proxy
- После крупных правок: `node scripts/sync-asset-versions.cjs` → `check:all` → новая метка
