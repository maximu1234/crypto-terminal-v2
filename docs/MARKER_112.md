# Метка 112 — Algo Bot без сетевого Auth (июль 2026)

**Тег:** `metka-112`

## Что вошло

### Algo Bot — cut Auth egress

- Standalone Algo Bot (`isAlgoBotLiteShell`) больше не бьёт Supabase Auth на boot:
  без `getSession` / `setSession` / `onAuthStateChange` / keepalive / silent refresh.
- Логин = локальный JWT из paste сессии Multichart (как metka-110).
- Push алертов / lock / remote — на локальном JWT; Multichart Auth без изменений.

### alert-worker

- `verifyUserToken` кэширует результат на 5 минут — reconnect/status не дергают `/auth/v1/user` каждый раз.

### Версии

- Web marker: `v0.112`
- Multichart desktop app: `v1.1.10`
- Mac tag (Multichart): `desktop-v1.1.10`
- Windows tag (Multichart): `desktop-win-v1.1.10`
- Algo Bot desktop app: `v1.0.117`
- Mac tag (Algo Bot): `algo-bot-v1.0.117`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.117`
