# Метка 124 — Auth circuit-breaker + LAN session health (август 2026)

**Тег:** `metka-124`

## Что вошло

### Auth / egress
- Circuit-breaker на Supabase Auth refresh: **429** → длинный backoff без
  спама; **400/401** → фатальный стоп (refresh стирается).
- Красный баннер `cloud-auth-problem-banner` + подсказка в шестерёнке.
- Algo Bot lite: локальный watch JWT без Auth-запросов; при истечении —
  явная просьба «Отдать сессию».
- LAN `/bot/status`: поле `authHealth` (ок / истекла / нет) — видно в окне
  **LAN** на Multichart без DevTools на сервере.

### LAN / UI hotfix
- Electron `Content-Length` для POST как строка (`Buffer.byteLength`) —
  фикс `net::ERR_INVALID_ARGUMENT` на отдаче сессии/списков.
- «Синхронизация с приложением успешна» больше не липнет в localStorage —
  только ~12 с после успешного «Применить сессию».
- Поля **Порт** / **Токен** в шестерёнке бота — тёмный стиль страницы.

## Версии

- Web marker: `v0.124`
- Multichart desktop app: `v1.1.23`
- Algo Bot desktop app: `v1.0.133`
- Mac tag (Multichart): `desktop-v1.1.23`
- Windows tag (Multichart): `desktop-win-v1.1.23`
- Mac tag (Algo Bot): `algo-bot-v1.0.133`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.133`
