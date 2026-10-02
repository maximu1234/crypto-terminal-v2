# Метка 186 — chrome flyouts + layout-drag coalesce

**Тег:** `metka-186`  
**Откат инициативы:** `metka-181`

## Что вошло

- Chrome motion: Elliott / Fib flyouts, trade-exchange dropdown + confirm overlay.
- `closeChromeSurface` abort-safe: reopen no longer raced with pending `settle()`.
- Coins / book layout drag: `syncDrawingToolsLayout` пропускается во время drag,
  полный sync на отпускании (в т.ч. если W×H не изменился с последнего кадра).

## Версии

- Web marker: `v0.186`
- Multichart desktop app: `v1.1.80` (без desktop-релиза)
