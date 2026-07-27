# Метка 105 — вход по ссылке из письма + сессия Algo Bot (июль 2026)

**Тег:** `metka-105`

## Что вошло

### Вход по magic link без браузера

- «Войти по ссылке» принимает URL из письма (`…/auth/v1/verify?token=…`) через `verifyOtp`.
- Сценарий: почта на телефоне → Copy link → вставка в Multichart / Algo Bot на машине без браузера.

### Algo Bot — сессия и облачная блокировка

- Импорт `mcauth1.…`: локальный JWT = вход даже если Supabase Auth недоступен.
- Облачная блокировка (`algo_bot_lock`) через отдельный anon-клиент — без `AuthSessionMissingError` после вставки сессии.

### Версии

- Web marker: `v0.105`
- Desktop app: `v1.1.4`
- Mac tag: `desktop-v1.1.4`
- Windows tag: `desktop-win-v1.1.4`
- Algo Bot Mac: `algo-bot-v1.0.108`
- Algo Bot Windows: `algo-bot-win-v1.0.108`
