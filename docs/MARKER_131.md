# Метка 131 — бэктест сделок/сут + TP1 fallback + trail SL (август 2026)

**Тег:** `metka-131`

## Что вошло

- **Бэктест (все стратегии):** во второй строке агрегатов квадратик **Сделок/сут**
  (закрытые ÷ длина истории свечей).
- **Algo Bot:** если объёма не хватает на три ТП (qty / min notional ~$5) —
  один reduce-only ТП на весь объём на уровне **ТП1**.
- **Algo Bot:** трейлинг СЛ после ТП1/ТП2 — повтор на каждом poll, пока биржевой
  SL не совпадёт с целевым; запись в session log.

## Версии

- Web marker: `v0.131`
- Multichart desktop app: `v1.1.31`
- Algo Bot desktop app: `v1.0.142`
- Mac tag (Multichart): `desktop-v1.1.31`
- Windows tag (Multichart): `desktop-win-v1.1.31`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.142`
