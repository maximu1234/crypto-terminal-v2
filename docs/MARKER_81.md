# Метка 81 — АлгоТрейдинг боты + редакции f/m (июль 2026)

**Тег:** `metka-81`

## Что вошло

### АлгоТрейдинг (desktop-only)

- Алго-профиль ключей и runtime (отдельно от Терминала).
- Боты St1–St3: live-ордера Bybit + ручной режим (алерты, только St1).
- Избранные (оранжевый флаг); опция watchlist = Избранные.
- St2/St3: 3×TP (⅓) + трейлинг СЛ; prefs бота отдельно от панели «Данные».
- Partial TP по entry qty, idempotent `orderLinkId`, cancel только bot-owned
  stops, persist pending across restart.
- Изолированный trade UI (стакан / оверлей / позиции) на `algoTrading.*`.

### Редакции desktop f / m

- `desktop/algo-trading-edition.cjs`: `f` = full, `m` = manual-only (друзья).
- Буква в подписи `.app`: `v0.81 / v1.0.74f` (или `…m`).
- Preload получает букву через `additionalArguments` (sandbox-safe).

## Версии

- Web marker: `v0.81`
- Desktop app: `v1.0.74`
- Mac tag: `desktop-v1.0.74`
- Windows tag: `desktop-win-v1.0.74`
