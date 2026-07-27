# Метка 103 — фильтр 24h объёма для АлгоБота + восстановление lite-вёрстки (июль 2026)

**Тег:** `metka-103`

## Что вошло

### Фильтр объёма за сутки (Multichart + Algo Bot)

- Pref: `minTurnover24hUsdt` (по умолчанию 20 000 000 USDT).
- UI: «Объем за сутки от» + USDT, формат `20.000.000`.
- Перед вооружением сетапа: проверка Bybit `turnover24h`; ниже порога → статус `SYMBOL: Объем не ликвидный`.
- Engine: `algo-bot-pattern-engine.cjs` (desktop + bot-app); REST отдаёт turnover.

### Standalone Algo Bot — lite layout

- Восстановлена bot-only вёрстка (без графика Multichart): `algo-bot-lite-layout` + `mountAlgoBotLiteLayout()`.
- В bot-app lite всегда включён; старт `algo-trading.html?botLite=1`.
- Не копировать оптом полную HTML/CSS/JS Multichart в `bot-app/site-bundle` без сохранения lite.

### UI Status

- Списки armed / signal в «Статус» открываются влево (не уходят под список монет).

### Версии

- Web marker: `v0.103`
- Desktop app: `v1.1.2`
- Mac tag: `desktop-v1.1.2`
- Windows tag: `desktop-win-v1.1.2`
- Algo Bot Mac: `algo-bot-v1.0.101`
- Algo Bot Windows: `algo-bot-win-v1.0.101`
