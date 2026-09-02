# Метка 160 — Terminal: свечи/линия, Regular/Log, курсор MACD

**Тег:** `metka-160`

## Что вошло

- **Свечи / линия:** переключатель на Терминале без `removeSeries()` у
  свечного ряда — правая шкала не пересоздаётся.
- **Шкала цены:** Regular и Logarithmic из меню правой шкалы; дефолт
  по-прежнему логарифм. Фибо, RR позиции и autoscale линии читают live mode.
- **Курсор:** горизонталь на панелях MACD / Volume / AO, как на RSI.
- **Вотчлист:** символ виджета экранируется (`escapeHtml`).
- **Prefs монет:** запись и чтение через один `normalizeCoinsPrefs`.
- **CI:** `check-asset-manifest` падает, если ключ `ASSETS` без файла на диске.

Оригинал Pattern 1-2 не менялся. Algo Bot standalone не релизили.

## Версии

- Web marker: `v0.160`
- Multichart desktop app: `v1.1.59`
