# Метка 134 — bar-close всегда REST + ТФ на скриншоте (август 2026)

**Тег:** `metka-134`

## Что вошло

- **Algo Bot:** на каждом закрытии бара TF для всех seeded-тикеров **всегда**
  REST-догрузка свечей, затем прогон паттерна. Убран skip «свеча уже в памяти»
  (после mid-bar seed пропускались сетапы вроде SUPERUSDT short).
- **Терминал:** на скриншоте графика (Копировать / Сохранить) подпись
  `Тикер - ТФ - Биржа` (например `BTCUSDT - 4h - Bybit`).

## Версии

- Web marker: `v0.134`
- Multichart desktop app: `v1.1.34`
- Algo Bot desktop app: `v1.0.145`
- Mac tag (Multichart): `desktop-v1.1.34`
- Windows tag (Multichart): `desktop-win-v1.1.34`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.145`
