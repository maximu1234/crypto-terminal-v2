# Метка 4 — эталон всего сайта Multichart

**Тег:** `metka-4` · **Коммит:** `git rev-parse metka-4`

Единая точка отката. После метки 4 выполнен **site-wide refactor** (модули, CI, тесты) — для отката только refactor см. коммит на теге или `git log metka-4..HEAD`.

## Страницы

| URL | Boot |
|-----|------|
| `/` | `screener.js` + `site-boot.js` |
| `/coins` | `coins-page-boot.js` → `terminal.js` |
| `/terminal` | `dashboard.js` |
| `/alerts` | `alerts-page.js` |
| `/listings`, `/trade-calculator`, `/system` | page JS + `site-boot.js` |

## Что работает

- График (desktop + iPad), RSI, invert scale
- Рисование incl. **Fibonacci** (preview, levels, trend line toggle)
- Алерты local + cloud + Telegram (worker)
- Cloud sync drawings / favorites / device state
- Auth OTP, system admin

## Ключевая структура

См. [ARCHITECTURE.md](./ARCHITECTURE.md) — facades, splits, CI.

## Откат

```bash
git checkout metka-4
```

Выборочно — paths из `docs/ARCHITECTURE.md` и истории коммита тега.
