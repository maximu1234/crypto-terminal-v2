# Метка 137 — overlays, Supertrend canvas, LAN книга (август 2026)

**Тег:** `metka-137`

## Что вошло

- **Стакан:** автоцентр восстановлен, колесо ≈7 рядов.
- **Supertrend:** отрисовка на canvas рисунков (без зависания графика);
  алго-оверлей фильтра отдельно от оригинала.
- **«Подобрать для всех»:** параллельные страницы kline при `batchGapMs = 0`.
- **Скринер:** окно зума не сбрасывается, без blur, Esc закрывает.
- **Алго Данные:** «Применить ко всем» пишет overlays по тикеру
  (колонки St1/St2/St3 независимы); «Применить к боту» — только книга бота.
- **Книга параметров:** persist в main (`algo-bot-ticker-books.json`);
  LAN «Отдать списки и книгу» на выбранную стратегию; старт бота читает
  snapshot или сохранённую книгу.
- **Загрузка страниц:** `site-boot` не тянет script-scan/statistics
  синхронно; LWC через preload; script-scan только desktop.
- **Algo Bot:** зеркало store/IPC/`POST /ticker-book`; lite HTML/CSS/stub
  логов сохранены. Hotfix `1.0.148`: в lite-бандл возвращены
  `pattern-ema-filter.js` и `pattern-tp-ema.js`. Hotfix `1.0.149`: экспорт
  `ensureActiveCoinVisible` в lite `terminal-table.js`; верхнее меню как в
  Multichart (Боты / Запустить / модалка стратегий). Hotfix `1.0.150`:
  в lite-бандл скопированы панель Данные (Supertrend, «Подобрать для всех»,
  поиск сетапов); lite-сетка без графика и 4-я колонка сверху сохранены.
  Hotfix desktop `1.1.38` / Algo Bot `1.0.151`: RSI на Терминале скрывается
  после ухода со страницы; LAN-книга гидратируется в окно бота; колонки
  Данные в lite прокручиваются.

## Версии

- Web marker: `v0.137`
- Multichart desktop app: `v1.1.38`
- Algo Bot desktop app: `v1.0.151`
- Mac tag (Multichart): `desktop-v1.1.38`
- Windows tag (Multichart): `desktop-win-v1.1.38`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.151`
