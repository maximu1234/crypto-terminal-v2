# Метка 6 — iPad crosshair + coins tablet (июнь 2026)

**Тег:** `metka-6` · **Коммит:** `git rev-parse metka-6`

Эталон после метки 5. Главное: **полное перекрестие на iPad `/coins`** (вертикаль + горизонталь), dock-probe без sandbox-флага, чеклист жестов пройден.

Предыдущий эталон: [MARKER_5.md](./MARKER_5.md) (`metka-5`).

## Страницы

| URL | Boot | Prod HTTP |
|-----|------|-----------|
| `/` | `screener.js` + `site-boot.js` | 200 |
| `/coins` | `coins-page-boot.js` → `chart-page.js` → `terminal.js` | 200 |
| `/terminal` | `dashboard.js` | 200 |
| `/alerts` | `alerts-page.js` | 200 |
| `/listings`, `/trade-calculator`, `/system` | page JS + `site-boot.js` | 200 |

## Новое с метки 5

- **iPad `/coins` crosshair:** SVG-горизонталь в `#charts-stack`, DOM-вертикаль `#linked-crosshair-vert`; обе линии в probe, future-area, рисовании
- **Coins tablet controller:** v2 (dock после отпускания) — единственный путь; удалён `?coins-tablet-v2=1/0`
- **Жесты iPad (проверено):** hold/dock, dismiss tap, future area, scale tap/hold, drawing placement
- **`linkChartsCrosshair`:** не сбрасывает vert во время `body.chart-probe-active`

## Что работает (наследие метки 5)

- График desktop + iPad, RSI, invert scale
- Рисование incl. Fibonacci (hit-test по горизонтальному span уровня)
- Алерты local + cloud + Telegram
- Cloud sync drawings / favorites / device state
- Auth OTP, system admin
- Монеты — все рынки (crypto, new, stocks, commodities, forex)
- Terminal dashboard: throttled history на старте

## Аудит (2026-06-02)

| Проверка | Результат |
|----------|-----------|
| `node --check` все `.js` | OK |
| `node scripts/check-asset-manifest.cjs` | OK (104 assets) |
| `node scripts/check-site-nav.cjs` | OK |
| `node --test tests/*.test.mjs` | OK (5/5) |
| Prod pages `crypto-terminal-v2.vercel.app` | 200 все основные URL |

## Следующий шаг

**Fib polish** — константы span/hit-test, тесты `fibLevelXSpan`, синхронизация `draw-hit` / `draw-render` с `fib-spec`.

## Откат

```bash
git checkout metka-6
```

Выборочно — `git log metka-5..metka-6`.
