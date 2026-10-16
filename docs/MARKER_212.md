# Метка 212 — стабильность оверлеев, алерты, релизный hardening

**Тег:** `metka-212`  
**Откат chrome/chart:** `metka-181`

## Что вошло

- Volume / EMA Shift: pin видимого диапазона как у MA (без hold/watch); убран nested preserve у Volume scale.
- Рисунки под свечами: прозрачный фон LW Charts, сетка выкл.; z-index drawings под `#chart`.
- Алерты: history pull при hydrate (в т.ч. Algo history-only); worker/events готовы к `exchange_id` (миграция SQL + legacy fallback).
- Web trade keys: файл на volume по hash email gate-токена; legacy `bybit.enc` мигрирует.
- Desktop: fallback на Vercel сбрасывает local origin; release CI сверяет marker↔package на tag-push; `REQUIRE_SUPABASE_ENV=1`; `cancel-in-progress: false`.
- Docs: updater вручную, Mac plaintext credentials, Pattern/Early T3 канон.

## Версии

- Web: `v0.212`
- Desktop: `v1.1.97` (Mac; Windows — по запросу)
