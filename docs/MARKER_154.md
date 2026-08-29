# Метка 154 — RSI Flip compound, MAE/ликв., инверт входов

**Тег:** `metka-154`

## Что вошло

- **RSI Touch Flip, аналитика:** чекбокс **Compound** (пересчёт от equity, не
  фиксированного бюджета); строки **Ликвидации** и **Макс. минус сделки** в
  Обзоре; ликвидация при equity ≤ 0.
- **Инвертировать входы:** чекбокс в колонке Обзор; та же логика в подборе,
  walk-forward и **live** (desktop + bot-app runtime).
- **bot-app/site-bundle** синхронизирован с плагином АлгоТрейдинг.

Оригинал Pattern 1-2 не менялся.

## Версии

- Web marker: `v0.154`
- Multichart desktop app: `v1.1.53`
- Algo Bot standalone: код обновлён в репо (`invertEntries` live); отдельный
  тег `algo-bot-v*` в этом релизе **не** выкатываем — только Multichart Mac/Win.
