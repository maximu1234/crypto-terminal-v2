# Метка 179 — MACD Flip Touch + метки только на закрытых барах

**Тег:** `metka-179`

## Что вошло

- **MACD Flip Touch:** новый бот аналитики/live (копия архитектуры RSI Flip).
  Strict crossover MACD/Signal (TV), MTF, книга, подбор Fast/Slow/Signal,
  доходность, live engine в `desktop/trading` и `bot-app/trading`.
- **Панель Данные MACD:** стили как у RSI, изоляция localStorage от RSI,
  подбор не трогает ТФ MACD/стек, вкладка «Доходность» работает.
- **Метки сделок (RSI + MACD):** на живом графике не ставятся на
  формирующуюся свечу — только после закрытия бара (`excludeFormingBar`).
- **Текст на графике:** многострочный ввод (Enter = новая строка).

## Версии

- Web marker: `v0.179`
- Multichart desktop app: `v1.1.78`
- Algo Bot (Windows): `v1.0.172`
