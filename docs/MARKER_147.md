# Метка 147 — Early T3 seed timeout, desktop 1.1.45

**Тег:** `metka-147`

## Что вошло

- SOCKS REST: abort/таймаут теперь реально снимает Promise, иначе seed
  зависал на 6 слотах без логов.
- Таймаут TLS через SOCKS-реле, если handshake не завершается.
- Early T3: seed concurrency 2, watchdog в лог сессии каждые 15 с,
  таймаут на тикер 45 с, WS на 639 пар не поднимается до seed.

Оригинал Pattern 1-2 math/paint не менялся.

## Версии

- Web marker: `v0.147`
- Multichart desktop app: `v1.1.45`
