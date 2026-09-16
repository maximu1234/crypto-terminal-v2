# Метка 170 — Windows: скриншот Терминала без списка монет

**Тег:** `metka-170`

## Что вошло

- **Windows, страница Терминал:** Copy / Save PNG больше не захватывает
  правую колонку списка монет и панель Позиции. Кроп идёт от CSS-вьюпорта
  страницы (`Page.getLayoutMetrics` / `innerWidth`), а не от
  `BrowserWindow.getContentSize()` — тот на Win из‑за DPI часто меньше
  снимка CDP, и область раздувалась вправо.
- Mac-путь `capturePage(rect)` не менялся. Оригинал Pattern 1-2 и
  `bot-app` не трогались.

## Версии

- Web marker: `v0.170`
- Multichart desktop app: `v1.1.69`
