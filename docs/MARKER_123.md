# Метка 123 — LAN-канал Multichart ↔ Algo Bot (август 2026)

**Тег:** `metka-123`

## Что вошло

- Окно **LAN** в Multichart: прямой HTTP-канал к боту (без worker) —
  старт/стоп, логи сессий, отдача списков и auth-сессии, просмотр настроек
  стратегии бота.
- В **Статус** остаётся облачный удалённый бот (worker) и cloud lock
  (Supabase).
- На боте: HTTP session-log server — `/bot/status`, `/bot/command`,
  `/auth/session`, `/watchlists`, prune логов старше 3 дней.
- Высота панели «Данные» на АлгоТрейдинге запоминается между заходами.
- Desktop Multichart: stub `algo-bot-remote-control.cjs` для packaged-requires.

## Версии

- Web marker: `v0.123`
- Multichart desktop app: `v1.1.22`
- Algo Bot desktop app: `v1.0.132`
- Mac tag (Multichart): `desktop-v1.1.22`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.132`
