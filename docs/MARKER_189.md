# Метка 189 — short chart pressed to right scale (AO+RSI)

**Тег:** `metka-189`  
**Откат инициативы chrome/chart:** `metka-181`

## Что вошло

- **Fix:** короткие истории прижимались к правой ценовой шкале при AO+RSI
  (и с позициями).
- Причина: `syncLinkedChartTimescales` (вызов и от AO, и от RSI) пересчитывал
  `barSpacing` у main без `rightOffset` / future margin; два индикатора
  усиливали гонку.
- Теперь: sync только копирует main→pane; re-fit spacing сохраняет
  `rightOffset: 4`; на settle — полный `settleCoinsChartViewport` из свечей.

## Версии

- Web marker: `v0.189`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
