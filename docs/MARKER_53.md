# Метка 53 — паттерн 1-2 в Скринере (июль 2026)

**Тег:** `metka-53` · **Веб:** `v0.53` · **Desktop:** `v1.0.46`

**Предыдущий эталон:** [MARKER_52.md](./MARKER_52.md) (`metka-52` / `desktop-v1.0.45`).

## Зачем

Паттерн **1-2, 1-2** на странице Скринер: виджеты сетки и увеличенный график по ПКМ — только дефолтные настройки, без окна настроек индикатора.

## Состояние

| Компонент | Описание |
|-----------|----------|
| Настройки | Чекбокс «Показывать Паттерн 1-2 1-2 в Скринере» — **Настройки → Системные** |
| Скринер | Overlay на виджетах; lazy-load математики; пересчёт на новом баре |
| ПКМ-окно | Тот же overlay в `screener-widget-zoom.js` при включённой опции |
| Терминал | Полный индикатор с настройками — без изменений (metka-52) |
| Рефактор | Общая отрисовка в `pattern-12-paint.js` |

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Пrefs | `js/screener-pattern-prefs.js` |
| Overlay | `js/screener-pattern-overlay.js`, `js/indicators/pattern-12-paint.js` |
| Скринер | `js/screener.js`, `js/screener-widget-zoom.js`, `css/screener.css` |
| Настройки | `js/app-settings-system-panel.js`, `css/app-settings-window.css` |
| `release-marker.js` | METKA 53, desktop 1.0.46 |

## Откат

```bash
git checkout metka-53
# или
git reset --hard metka-53   # только если уверены
```
