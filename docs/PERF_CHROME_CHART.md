# Perf: chrome ≠ chart (OpenMarket-style)

Инициатива ускорения ощущения UI (панели, boot, меньше лишних redraw)
**без** смены стека на Vue и **без** замедления свечей / алертов.

## Откатная метка (обязательно сохранять)

| | |
|---|---|
| **Rollback metka** | **`metka-181`** |
| Commit | `e88cbde` — MOEX read-only + drawing lock / Save Template fix |
| Web | `v0.181` |
| Desktop | `v1.1.80` |
| Bot | `v1.0.174` |

Пока идёт эта инициатива:

1. Локальный и remote тег **`metka-181` не удалять**, даже если обычное
   правило «оставить только N…N-3» уже ушло дальше.
2. `docs/MARKER_181.md` не удалять.
3. При критической регрессии — откат к `metka-181` (чистая база без
   chrome/chart perf-изменений).
4. Каждый проверочный релиз — **своя** метка (`metka-182+`), но rollback
   остаётся `181`.

## Решения продукта (зафиксировано)

- Страницы v1: **Терминал** и **Скринер**.
- Плавность v1: **coins panel**, **стакан**, **настройки**; затем полный
  аудит всех панелей/окон по приложению.
- **Алерты / cloud sync не откладывать** (скорость появления и снятия —
  основа торговли).
- IndexedDB для рисунков — **отложено**.
- Feature-flag в Системных не нужен: откат = `metka-181`.

## Критический путь (не трогать / не await-ить лишнее)

```
exchange context → market-api → candles fetch → chart paint
alerts registry / monitor / cloud (как сейчас по срочности)
```

Запрещено на критическом пути свечей:

- ждать анимации панелей;
- ждать lazy-модулей UI chrome;
- синхронный heavy localStorage на pan/zoom.

## Фазы

| Фаза | Содержание | След. metka | Статус |
|------|------------|-------------|--------|
| 0 | Baseline + ограждения + этот документ | — / prep | done |
| 1 | Chrome ≠ chart: scheduler + skip no-op resize + settings overlay pause | **182** | done |
| 2 | Motion: coins panel, стакан, настройки | **183** | in progress |
| 2b | Полный аудит всех «плавных» chrome-элементов | 184+ | pending |
| 3 | Boot skeleton (Terminal + Screener) | после 2 | pending |
| 4 | Lazy **только** не-алерты (trade book UI, тяжёлые настройки) | осторожно | pending |
| 5 | IndexedDB drawings | позже | pending |
| 6–7 | CDN hash / workers | по профилю | pending |

## Smoke после каждой фазы

- Терминал: cold load → BTC/USDT; смена тикера; TF; pan/zoom.
- Скринер: 9 виджетов; пагинация.
- Алерты: создать / сработать / убрать — без видимой задержки vs 181.
- Настройки: открыть/закрыть — график не должен мигать без смены layout.
- Desktop: `bundle:sync` + smoke `.app` при desktop-релизе.

## Фаза 1 — код

- `js/chart-redraw-scheduler.js` — coalesced paint + filter chrome reasons.
- `js/chart-layout-gate.js` — `beginChromeOverlay` / `endChromeOverlay`.
- `js/drawings/draw-redraw-loop.js` — через scheduler; `scheduleRedraw(reason)`.
- `js/terminal/terminal-chart-layout.js` — skip resize при тех же W×H; pause под overlay настроек.
- `js/app-settings-window.js` — overlay pause.
- `js/screener.js` — rAF coalesce ResizeObserver; skip `applyOptions` при том же размере.
