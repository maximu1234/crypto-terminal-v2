# Метка 72 — полная изоляция Bybit/BingX (июль 2026)

**Тег:** `metka-72`

## Что вошло

### Два независимых renderer-модуля торговли

- Bybit: `js/trade/bybit/*`.
- BingX: `js/trade/bingx/*`.
- Общий `js/trade/module-router.js` только выбирает активный bundle.
- Верхнеуровневые `trade-positions-cache.js`, `trade-stream-bridge.js`,
  `trade-chart-overlay.js`, `trade-auto-stops.js`, `trade-market-entry.js`,
  `trade-book-panel.js` стали тонкими facades без биржевой логики.
- Старые общие policy-файлы удалены.

### Bybit

- Восстановлен мгновенный optimistic-показ позиции после рыночного входа.
- Краткий пустой stream/REST-лаг больше не скрывает свежую позицию и не ставит
  tombstone.

### BingX

- После входа устранён REST-шторм: обычные sync используют кэш, backup poll
  увеличен до 6 секунд.
- Optimistic-позиция 8 секунд не вызывает повторные REST-проверки.
- Auto SL/TP и reconcile запускаются с задержкой, чтобы не попасть в rate limit.
- Пустой stream и tombstone остаются BingX-специфичной логикой.

### Аудит и защита от регрессий

- При смене биржи старый stream/cache останавливается до сброса router; затем
  desktop-страница перезагружается без старых DOM listeners (terminal + watchlist).
- Facades soft-fail, если модуль ещё не загружен / в окне reset.
- `module-router` игнорирует устаревшие concurrent-load.
- Auto SL/TP localStorage разнесён: `…_bybit_v1` / `…_bingx_v1`.
- Удалены мёртвые `js/trade/exchanges/*` и shared `trade-position-open-orders.js`.
- Торговые настройки загружают активный exchange bundle до Auto SL/TP UI.
- Добавлен `tests/trade-exchange-isolation.test.mjs`: cross-imports,
  thin-facades, порядок остановки при switch, уникальность `extraResources`.
- Локально собраны Mac (`desktop-v1.0.66`) и Windows (`desktop-win-v1.0.66`).

## Версии

- Web marker: `v0.72`
- Desktop app: `v1.0.66`
- Mac tag: `desktop-v1.0.66`
- Windows tag: `desktop-win-v1.0.66`
