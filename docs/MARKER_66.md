# Метка 66 — алерты worker, Share PnL Дневник, Windows PnL exe (июль 2026)

**Тег:** `metka-66`

## Что вошло

- **Алерты (worker):** ticker WS + REST sweep 15с; cross на первом kline-тике; baseline seed; `/reload-hint`; `build: 2026-07-11-ticker-v2`. Telegram при закрытом desktop.
- **Дневник Share PnL:** отдельная колонка иконки; модалка той же высоты, что в Позициях; калибровка карточки 1323×960; плечо из Bybit `closed-pnl`.
- **Windows desktop:** bundled `pnl-card-generator.exe` (PyInstaller) — PnL-карточки без Python у пользователя; Mac без изменений (`python3`).

## Версии

- Web marker: `v0.66`
- Desktop app: `v1.0.59` (Mac `.dmg` → `desktop-v1.0.59`, Win `.exe` → `desktop-win-v1.0.59`)
