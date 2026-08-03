# Метка 125 — stop GoTrue Auth spam (август 2026)

**Тег:** `metka-125`

## Что вошло

- GoTrue `getSession()` всегда refresh’ит near-expiry JWT даже при
  `autoRefreshToken: false` — из‑за этого шли 429/400 в консоли.
- **Algo Bot lite:** storage Auth-клиент больше не создаётся; cloud lock
  грузит только UMD (`ensureSupabaseSdk`).
- После 429/400: локальный backoff + cloak сессии для GoTrue (без POST
  refresh) + fetch-wrapper на `/auth/v1/token`.
- Красный баннер Auth — **только на Algo Bot**, не в Multichart.
- Убрана вводящая в заблуждение фраза «бот не долбит Auth».

## Версии

- Web marker: `v0.125`
- Multichart desktop app: `v1.1.25` (hotfix Mac)
- Multichart desktop app (prior): `v1.1.24`
- Algo Bot desktop app: `v1.0.134`
- Mac tag (Multichart): `desktop-v1.1.25`
- Windows tag (Multichart): `desktop-win-v1.1.24`
- Mac tag (Algo Bot): `algo-bot-v1.0.134`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.134`

### Hotfix Multichart Mac `1.1.25`

- LAN «Отдать сессию» / POST: не ставить `Content-Length` вручную (Electron
  `net::ERR_INVALID_ARGUMENT`); нормализация `IP:порт` в поле хоста.
- Тег: `desktop-v1.1.25` (только Mac Multichart).
