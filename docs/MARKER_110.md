# Метка 110 — Algo Bot session paste VPS hotfix (июль 2026)

**Тег:** `metka-110`

## Что вошло

### Algo Bot: paste сессии на VPS

- На Algo Bot сессия из Multichart применяется **локально сразу** (JWT в storage), без ожидания `supabase.auth.setSession` (на удалённых серверах зависало на «Применяем сессию…»).
- Зелёный статус «Синхронизация с приложением успешна» показывается сразу после локального apply.
- Проверка Telegram Chat ID больше не блокирует UI.
- `getSupabase()` при paste — с коротким таймаутом; без живого Auth-клиента paste всё равно сохраняет JWT.

### Версии

- Web marker: `v0.110`
- Multichart desktop app: `v1.1.8` (без нового desktop-релиза)
- Algo Bot desktop app: `v1.0.115`
- Mac tag (Algo Bot): `algo-bot-v1.0.115`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.115`
