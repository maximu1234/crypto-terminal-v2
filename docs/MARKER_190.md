# Метка 190 — multi-pane indicator viewport isolation

**Тег:** `metka-190`  
**Откат инициативы chrome/chart:** `metka-181`

## Аудит

Панели Терминала: **RSI, Volume, AO, MACD**. Оверлеи (MA, Supertrend,
Pattern 1-2, Horizontal Volume) timescale не пишут.

| Риск | Было | Сейчас |
|------|------|--------|
| syncViewport → applyCoinsChartViewport на main | AO/Vol/MACD/RSI | все → copy-only |
| syncLinkedChartTimescales pairwise price-scale | AO↔RSI↔Vol↔MACD | time copy only |
| minimumWidth ratchet | рос от самой широкой шкалы | equalize all panes + reset base |
| applyIndicatorPaneViewport | мёртвый, но опасный | тоже copy-only |

## Версии

- Web marker: `v0.190`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
