# Метка 117 — дневник Алго, min-notional, статус бота (август 2026)

**Тег:** `metka-117`

## Что вошло

### Дневник Алготрейдинга (только Multichart)

- Кнопка **«Д»** после глазика в панели позиций → модалка ~70% экрана.
- История закрытых сделок по **algo-ключам** (`algoTrading.getClosedPnl` /
  `getTradeDiaryDetail`), UX как у основного Дневника: период, дни, раскрытие
  (executions + график). Быстрый список (`skipExecutions`), детали при раскрытии.
- Код: `js/algo-trading/diary/**`, `css/algo-trading-diary-modal.css`. В bot-app
  дневник не добавлялся.

### Min notional $5 перед входом

- Перед триггером/market-входом: если risk-объём &lt; минимума Bybit (~$5) —
  ордер не ставится, в Статусе причина (`объём $X &lt; минимум Bybit $5`).
- Объём **не** раздувается до минимума (раньше `ensureMinNotionalVolume` поднимал).

### Статус бота

- Убраны неверные **Итого ($)** / «закрыта ±N USDT» и win/loss session PnL.
- **Armed сетапов** = только тикеры с живым entry-триггером (не SL/TP позиций).
- **Настройки**: кнопка → выпадающий текстовый снимок всех настроек стратегии.

### Прочее

- Прокрутка в модалке дневника; стили кнопок периода/обновить как у Дневника.

## Версии

- Web marker: `v0.117`
- Multichart desktop app: `v1.1.17`
- Mac tag (Multichart): `desktop-v1.1.17`
- Windows tag (Multichart): `desktop-win-v1.1.17`
- Algo Bot desktop app: `v1.0.125`
- Mac tag (Algo Bot): `algo-bot-v1.0.125`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.125`

### Hotfix после metka-117 (в той же метке)

| Версия | Суть |
|--------|------|
| Bot `1.0.125` | Stop→Start не сбрасывает `pendingEntries` / bot meta для SL/TP |
| Multichart `1.1.16` | Auth egress: remote Status JWT cache 30m + poll 30s |
| Multichart `1.1.17` | PostgREST cut: chart→alerts throttle, worker reload ~30m |
