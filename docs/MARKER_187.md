# Метка 187 — Terminal AO viewport jump on symbol switch

**Тег:** `metka-187`  
**Откат инициативы chrome/chart:** `metka-181`

## Что вошло

- **Fix:** при включённом AO (и Volume / MACD / RSI) смена тикера на Терминале
  больше не даёт случайный zoom (сжатый / растянутый / уехавший за край).
- Причина: `barSpacing` считался по `timeScale().width()` панели индикатора
  (ширина шкалы цен меняется от тикера к тикеру); несколько панелей
  перезаписывали viewport основного графика.
- Теперь spacing всегда от main chart; `syncViewport` панелей только копирует
  range/spacing с основного, не пересчитывает.

## Версии

- Web marker: `v0.187`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
