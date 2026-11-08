# Метка 228 — плавная шкала времени, zoom floor на скринере, audit fixes

**Тег:** `metka-228`  
**Desktop:** `desktop-v1.2.13` (Mac)  
**Откат:** `metka-227` / `desktop-v1.2.12`  
**Откат chrome/chart:** `metka-181`

## Что вошло

- Шкала времени двигается с паном: стабильная фаза multi-day ticks, гистерезис шага, pixel-snap подписей, sync barSpacing панели с main.
- Zoom-out floor (`maxZoomOutBars`) на Скринере / Zoom / Script через `applyScreenerZoom` — как на Терминале.
- Lifecycle `linkPaired` / `bindTimeGuide` / `chart.remove`: unlink на Zoom, Terminal, Watchlist; очистка guide listeners.
- Один общий OHLC second-tick вместо N таймеров на виджеты.
- `scheduleRebuild`: setTimeout только когда вкладка hidden.
- Bybit positions REST poll: 5s → 15s.
- Dock show/hide вынесен в `desktop/platform/darwin.cjs`.
- Fib / history-cull правки из рабочей ветки (в том же коммите).

## Версии

- Web: `v0.228`
- Desktop: `v1.2.13` (сборка Mac)
- Algo Bot: без изменений
