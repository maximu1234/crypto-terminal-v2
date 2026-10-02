# Метка 182 — chrome ≠ chart (фаза 1)

**Тег:** `metka-182`  
**Откат всей инициативы:** `metka-181` (не удалять)

## Что вошло

- **Scheduler:** `chart-redraw-scheduler.js` — coalescing + chrome-reasons no-op.
- **Gate:** `beginChromeOverlay` / `endChromeOverlay` в `chart-layout-gate.js`.
- **Drawings:** `draw-redraw-loop` через scheduler, `scheduleRedraw(reason)`.
- **Терминал:** skip `resizeCharts`, если W×H не изменились; pause resize под окном Настроек.
- **Скринер:** rAF coalesce ResizeObserver; skip `applyOptions` при том же размере.
- **Алерты:** не откладывались (критический путь без изменений).

## Smoke

- Терминал / Скринер / алерты vs `metka-181`.
- Открыть Настройки — график без лишнего мигания.

## Версии

- Web marker: `v0.182`
- Multichart desktop app: `v1.1.80` (без desktop-релиза на этой метке)
- Algo Bot: без изменений
