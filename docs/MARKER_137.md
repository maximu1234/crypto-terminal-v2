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
  логов сохранены.

## Версии

- Web marker: `v0.137`
- Multichart desktop app: `v1.1.37`
- Algo Bot desktop app: `v1.0.147`
- Mac tag (Multichart): `desktop-v1.1.37`
- Windows tag (Multichart): `desktop-win-v1.1.37`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.147`
