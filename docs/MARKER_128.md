# Метка 128 — Algo universe backtest, maxPt1Pt4Bars, LAN ticker filter (август 2026)

**Тег:** `metka-128`

## Что вошло

- **Algo Data:** бэктест стратегии по Топ-100 / всем тикерам (модалка, прогресс,
  агрегаты $, вторая строка R: BE / Open / WR / E[R] / ΣR / Closed).
- **Аналитика:** лимит баров pt1→pt4 (пусто = без лимита); TP→EMA только в
  колонке аналитики (в бот не переносили).
- **Бот St1–St3:** поле «бары pt1→pt4» в настройках стратегии (Multichart +
  remote bot); пусто = без лимита.
- **LAN логи:** поиск по тикеру в окне канала с ботом.
- Прочее из рабочей ветки: auth/session keepalive тесты, pattern settings UI,
  sync ассетов.

## Версии

- Web marker: `v0.128`
- Multichart desktop app: `v1.1.28`
- Algo Bot desktop app: `v1.0.137`
- Mac tag (Multichart): `desktop-v1.1.28`
- Windows tag (Multichart): `desktop-win-v1.1.28`
- Mac tag (Algo Bot): `algo-bot-v1.0.137`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.137`

## Hotfix Algo Bot 1.0.138

- Добавлен отсутствующий `pattern-12-scene-cache.js` в `bot-app/site-bundle` (404 ломал boot).
- Mac/Win tags: `algo-bot-v1.0.138` / `algo-bot-win-v1.0.138`.

## Hotfix Algo Bot 1.0.139

- Stub `bot-session-logs-viewer.js` on Algo Bot (Multichart LAN module broke boot: missing `fetchLanBotStatus`).
- Guard in `check-bot-lite-bundle.cjs`.
