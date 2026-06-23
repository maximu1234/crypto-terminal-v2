# Метка 40 — trade book UI, draw hotkeys, alerts & stream polish (июнь 2026)

**Тег:** `metka-40` · **Desktop:** `desktop-v1.0.32` (DMG)

**Текущий эталон отката.** Предыдущий: [MARKER_39.md](./MARKER_39.md) (`metka-39` / `desktop-v1.0.31`).

Проверено: `npm run check:all`, `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/terminal`: trade boot только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| `body.trade-page` только desktop | ✅ |
| Trade init — lazy `trade-desktop-boot` / gate `isDesktop` | ✅ |
| Bybit private WS / trading IPC — только Electron main | ✅ |
| `trade-stream-bridge` — gate `trade-page` + `onStream` | ✅ |

## Что вошло после metka-39

### Desktop only — торговля

| Компонент | Описание |
|-----------|----------|
| Панель Позиции/Ордера | Компактные строки; треугольники long/short; PnL/Объём справа; заголовки как в списке монет |
| Разделители блоков | Единые 2px линии; без двойной границы у панели позиций |
| Шапка панели | Компактный селект Позиции/Ордера; меню настроек только по клику, не по ховеру |
| Stream / sync | Периодический REST reconcile позиций и ордеров; мгновенное снятие после SL/TP fill |
| Volume presets | Автофокус поля активного пресета при открытии dropdown |
| Autorefresh | Подпись «Autorefresh», кнопки 10s / 1m / Never |

### Терминал — рисование и UI

| Компонент | Описание |
|-----------|----------|
| Горячие клавиши | **L** / **S** / **F** (EN+RU раскладка) → Long / Short / Fib |
| Выделение | Hotkey снимает hover-select; style bar только при закреплении кликом |
| Placement | Фикс preview второй точки long/short/fib при смене диапазона |
| Scrollbars | Глобальные тёмные 6px |
| Split resize | Список монет ↔ позиции без overlap; sticky headers |

### Алерты

| Компонент | Описание |
|-----------|----------|
| Daily TF false trigger | На той же свече что baseline — только close, не wick (client + worker) |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=40, desktop=1.0.32 |
| `trade-book-panel.js` | 22 |
| `trade-book-panel.css` | 20 |
| `trade-stream-bridge.js` | 5 |
| `terminal.js` | 340 |
| `drawings/init.js` | 112 |
| `alert-monitor.js` | 65 |
| `desktop/package.json` | 1.0.32 |

## Откат

```bash
git fetch --tags
git checkout metka-40   # текущий
git checkout metka-39   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `/terminal` | Панель позиций: колонки, треугольники, итоговый PnL |
| Desktop | L/S/F на графике; клик → постановка; hover без style bar |
| Desktop | Закрытие позиции SL — панель и график в sync |
| Desktop | 1D алерт не срабатывает на фитиле той же свечи |
| Desktop Dock | v0.40 / v1.0.32 |

## Теги

```bash
git tag -a metka-40 -m "metka-40: trade book UI, draw hotkeys, alerts fix"
git tag -a desktop-v1.0.32 -m "desktop-v1.0.32: bundled UI metka-40"
```
