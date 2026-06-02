# Метка 4 — эталон всего сайта (2026-06-02)

**Тег:** `metka-4` · **Коммит:** `git rev-parse metka-4`

Единая точка отката для всего Multichart: график, алерты, облако, рисование, страницы.

---

## Страницы

| URL | HTML | Основной JS |
|-----|------|-------------|
| Главная (скринер) | `index.html` | `screener.js` + `site-boot.js` |
| Монеты | `coins.html` | `coins-page-boot.js` → `terminal.js` |
| Терминал (дашборд) | `terminal.html` | `dashboard.js` + `terminal-page.js` |
| Алерты | `alerts/index.html` | `alerts-page.js` |
| Листинги | `listings.html` | `listings.js` |
| Калькулятор | `trade-calculator.html` | `trade-calculator.js` |
| Система | `system/index.html` | `system-admin-page.js` |

Общий spine: **`site-boot.js`** — Supabase, alert monitor, cloud sync, mobile nav.

---

## Что работает (проверено)

### График
- Скринер, `/coins`, dashboard widgets (LWC + `chart.js`)
- iPad: жесты (`chart-tablet-gestures.js`), шкала как на десктопе
- RSI, crosshair, invert menu на price scale

### Рисование
- Trendline, channel, hray, long/short, fib
- **Fibonacci:** уровни видны; preview без flash на весь экран; trend line off по умолчанию
- Cloud sync рисунков (`drawings-cloud-sync.js`)

### Алерты
- Локальный registry + линии на графике
- Cross-TF через `alert-monitor.js` (WS)
- Cloud registry + Telegram через `alert-worker` (Railway)
- Страница `/alerts`

### Облако / auth
- OTP login, device sync (drawings, favorites, alerts)
- Throttle для Yandex (`cloud-sync-throttle.js`)

### Данные
- Bybit REST/WS через `api/bybit.js` (Vercel) + worker proxy
- Twelve Data через `api/twelvedata.js`

---

## Ключевые god-файлы (размер ≈ сложность)

| Строк | Файл |
|------:|------|
| ~10700 | `js/drawings/init.js` |
| ~5800 | `js/alerts-cloud-sync.js` |
| ~5080 | `js/chart.js` |
| ~4010 | `js/terminal.js` |
| ~3800 | `js/drawings-cloud-sync.js` |
| ~3010 | `js/alerts.js` |
| ~2570 | `js/cloud-sync.js` |

---

## Версии ассетов (snapshot)

Смотреть актуальные: `js/asset-manifest.js` или `git show metka-4:js/asset-manifest.js`.

Ключевые на момент метки:
- `drawings.js` v=193, `drawings/init.js` v=15
- `site-boot.js` v=80, `auth-ui.js` v=25
- `chart.js` v=107, `terminal.js` v=253

---

## Откат

**Весь сайт на метке:**
```bash
git checkout metka-4
```

**Выборочно (типичные области):**
```bash
# График + coins
git checkout metka-4 -- js/chart.js js/chart-tablet-gestures.js js/terminal.js js/coins-page-boot.js coins.html css/terminal.css

# Рисование / fib
git checkout metka-4 -- js/drawings.js js/drawings/ js/chart-widget-host.js

# Алерты
git checkout metka-4 -- js/alerts.js js/alerts-cloud-sync.js js/alert-monitor.js alert-worker/

# Облако / auth
git checkout metka-4 -- js/cloud-sync.js js/auth-ui.js js/supabase-client.js

# Версии и boot
git checkout metka-4 -- js/asset-manifest.js js/site-boot.js
```

---

## Удалённые старые метки

`metka-1`, `metka-2`, `metka-3` и `docs/MARKER_1/2/3.md` — сняты; эталон только **Метка 4**.
