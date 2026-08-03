# Метка 122 — Algo Bot lite layout restore (август 2026)

**Тег:** `metka-122`

## Что вошло

- Восстановлен lite-layout Algo Bot: класс `algo-bot-lite-layout`, nav «АлгоБот»,
  `mountAlgoBotLiteLayout()` (сетка без меню Multichart и без видимого графика).
- Регрессия: metka-117 убрал body-класс/nav; metka-120 перезаписал bot
  `algo-trading.js` с Multichart и стёр lite-builder.
- Заголовок окна бота: «Multichart Algo Bot» (раньше ошибочно «Multichart»).
- Усилен `scripts/check-bot-lite-bundle.cjs` (HTML + JS + CSS).
- В Multichart `js/algo-trading.js` — gated-копия lite-helper (только
  `botLite` / algo-bot), без смены desktop-версии Multichart.

## Версии

- Web marker: `v0.122`
- Multichart desktop app: `v1.1.21` (без нового релиза)
- Algo Bot desktop app: `v1.0.130`
- Mac tag (Algo Bot): `algo-bot-v1.0.130`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.130`
