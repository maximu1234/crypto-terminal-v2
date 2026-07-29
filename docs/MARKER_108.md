# Метка 108 — lock hardening + refresh/reconnect stability (июль 2026)

**Тег:** `metka-108`

## Что вошло

### Безопасность cloud lock (`algo_bot_lock`)

- Добавлена миграция `supabase/migration-algo-bot-lock-v3.sql`.
- `algo_bot_lock` переведён на доступ только для `authenticated` (без `anon` write).
- RLS ограничивает доступ своим `lock_key` в формате `user:<uuid>`.
- Клиенты lock в Multichart и в site-bundle Algo Bot используют user JWT (`Bearer <access_token>`).

### Стабильность авторизации и remote-runtime

- В `cloud-sync` добавлен single-flight на `refreshSession()`, чтобы убрать параллельные refresh-race.
- В `algo-bot-remote-control.cjs` добавлен `clearReconnectTimer()` в `connect()` и `notifyAuthSessionChanged()`.
- Для cloud lock в runtime Algo Bot добавлена явная проверка наличия `access_token`.

### Защита bot-lite верстки от drift

- Добавлен guard `scripts/check-bot-lite-bundle.cjs`.
- Проверка подключена в `scripts/pre-refactor-check.cjs` (`npm run check:all`).
- Теперь чек падает, если из `bot-app/site-bundle/css/algo-trading.css` пропадают ключевые `algo-bot-lite-layout` селекторы.

### Версии

- Web marker: `v0.108`
- Multichart desktop app: `v1.1.7`
- Algo Bot desktop app: `v1.0.113`
- Mac tag (Multichart): `desktop-v1.1.7`
- Windows tag (Multichart): `desktop-win-v1.1.7`
- Mac tag (Algo Bot): `algo-bot-v1.0.113`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.113`
