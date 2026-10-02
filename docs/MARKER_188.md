# Метка 188 — Terminal viewport + open positions

**Тег:** `metka-188`  
**Откат инициативы chrome/chart:** `metka-181`

## Что вошло

- **Fix:** после 187 тикеры без позиций листались нормально, с открытой
  позицией (линии/бейджи) viewport снова «ломался».
- Причина: sync price-scale (AO + обновления позиции) меняет ширину plot
  без resize wrap → `barSpacing` устаревал; `applyOptions({ barSpacing })`
  без повторного `setVisibleLogicalRange` давал drift у LW.
- Теперь: после смены barSpacing range всегда восстанавливается;
  `syncLinkedChartTimescales` пересчитывает spacing после scale sync;
  `resizeCharts` рефитит даже при том же W×H wrap; доп. re-fit на settle
  тикера (+ rAF).

## Версии

- Web marker: `v0.188`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
