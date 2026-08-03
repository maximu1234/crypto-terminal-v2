# Метка 120 — session logs, EMA select, auth keepalive (август 2026)

**Тег:** `metka-120`

## Что вошло

### Algo Bot: логи сессий + просмотр с Multichart

- Status-сигналы пишутся в файлы сессий: `Logs/.../algo-bot-sessions/`.
- На боте (шестерёнка): HTTP-доступ к логам (порт/токен), без Supabase/worker.
- В Multichart Статус → «Посмотреть логи удалённого бота» (окно ~70%, Статус закрывается).

### UI: EMA select в панели Данные

- Тёмный styled `<select>` (Win/Electron): `appearance:none`, шире под «Текущий».

### Auth: меньше ложных разлогинов

- Таймаут refresh больше не стирает `refresh_token` (только fatal 400/invalid_grant).
- Проактивный refresh за ~12 мин до истечения JWT; keepalive на Multichart Algo-странице.
- Heal primary из `cloud-auth-session.json`, если refresh стёрт.

## Версии

- Web marker: `v0.120`
- Multichart desktop app: `v1.1.20`
- Mac tag (Multichart): `desktop-v1.1.20`
- Windows tag (Multichart): `desktop-win-v1.1.20`
- Algo Bot desktop app: `v1.0.128`
- Mac tag (Algo Bot): `algo-bot-v1.0.128`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.128`
