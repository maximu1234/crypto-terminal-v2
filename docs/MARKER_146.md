# Метка 146 — Early T3 seed через SOCKS, desktop 1.1.44

**Тег:** `metka-146`

## Что вошло

- **1-2 Early T3:** seed свечей шёл в Bybit напрямую (`defaultSession` + bypass
  `api.bybit.com`), поэтому при включённом прокси зависал после «Запущен».
- Algo REST для Bybit идёт тем же SOCKS-реле, что Терминал.
- Bybit убран из Chromium proxy bypass.
- В лог сессии пишется `Early T3 seed 0/N` и первые ошибки seed.

Оригинал Pattern 1-2 math/paint не менялся.

## Версии

- Web marker: `v0.146`
- Multichart desktop app: `v1.1.44`
