# Метка 213 — хвосты аудита (viewport, bot-app, docs)

**Тег:** `metka-213`  
**Откат chrome/chart:** `metka-181`  
**Откат этой точки:** `metka-213` / `desktop-v1.1.98`

## Что вошло

- Viewport: pin/`captureHealthy` не подменяет левый край правым `lastHealthy`; shocked `from≈0` после history prepend отбрасывается; suppress только при `from < 5`.
- Рисунки на панелях RSI/MACD/AO/Volume под HUD и crosshair (`z-index: 2`).
- Algo Bot: fallback сбрасывает local origin; UI-gate сравнивает origin; `trading:*` stub; tray только algo.
- CI/release: `bundle:site` + `check-bot-lite-bundle` для bot-app; site-bundle вне syntax-scan.
- Docs: Keychain wording, updater, HANDOFF, ARCHITECTURE, `exchange_id` в чеклисте алертов.

## Версии

- Web: `v0.213`
- Desktop: `v1.1.98`
