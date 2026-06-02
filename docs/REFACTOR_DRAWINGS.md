# Refactor drawings — план (после metka-9)

**Текущий эталон:** [MARKER_9.md](./MARKER_9.md) (`metka-9`).

**Принцип:** одна фаза = один PR = одна метка = [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md) пройден.

## Статус

| Фаза | Задача | Риск | Статус |
|------|--------|------|--------|
| **0** | Чеклист регрессии + autotests `draw-hit` + `check:all` | низкий | ✅ metka-8 |
| **1** | Wire `createDrawHitTester` + `createDrawRenderer` | средний | ✅ metka-8 |
| **2** | Wire `mountTabletDrawInput` из `drawings-tablet-input.js` | средний | ✅ metka-9 |
| **3** | Split `drawings-cloud-sync.js` | высокий | pending |
| **4** | Split `alerts-cloud-sync.js` | высокий | pending |

## Фаза 2 — выполнено (metka-9)

1. `init.js` импортирует `mountTabletDrawInput` из `drawings-tablet-input.js`, дубли tablet input удалены.
2. `npm run check:all` — green.
3. Ручной чеклист: desktop preview + cross-device sync/delete — OK.
4. Tag `metka-9`.

## Фаза 3 — критерии готовности

1. `drawings-cloud-sync.js` разбит на модули в `drawings-cloud/` (lifecycle, pull-reconcile, worker-client уже заготовлены).
2. `npm run check:all` — green.
3. Ручной чеклист DRAWINGS_REGRESSION (create / delete cross-device).
4. Tag `metka-10`.

## Не делать

- Big-bang: все модули в одном PR.
- Новые фичи рисования параллельно с wiring.
- Удалять `draw-hit.js` / `draw-render.js` до wiring (потеря подготовленного кода).

## Rollback

```bash
git checkout metka-9   # текущий эталон
git checkout metka-8   # до фазы 2 (tablet wiring)
git checkout metka-7   # до cloud/delete fixes и фазы 1
git checkout metka-10  # после фазы 3 (когда появится)
```
