# Refactor drawings — план (после metka-7)

**Текущий эталон:** [MARKER_7.md](./MARKER_7.md) (`metka-7`) — самая рабочая версия.

**Принцип:** одна фаза = один PR = одна метка = [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md) пройден.

## Статус

| Фаза | Задача | Риск | Статус |
|------|--------|------|--------|
| **0** | Чеклист регрессии + autotests `draw-hit` + `check:all` | низкий | ✅ |
| **1** | Wire `createDrawHitTester` + `createDrawRenderer`, удалить дубли из `init.js` | средний | ✅ code — ждёт ручной чеклист + `metka-8` |
| **2** | Wire `mountTabletDrawInput` из `drawings-tablet-input.js` | средний | pending |
| **3** | Split `drawings-cloud-sync.js` | высокий | pending |
| **4** | Split `alerts-cloud-sync.js` | высокий | pending |

## Фаза 1 — критерии готовности

1. `init.js` импортирует `draw-hit.js` и `draw-render.js`, локальные копии `drawFib` / `fibBodyDist` / … удалены.
2. `npm run check:all` — green.
3. Ручной чеклист DRAWINGS_REGRESSION (desktop + iPad fib edit) — OK.
4. Tag `metka-8`.

## Не делать

- Big-bang: все модули в одном PR.
- Новые фичи рисования параллельно с wiring.
- Удалять `draw-hit.js` / `draw-render.js` до wiring (потеря подготовленного кода).

## Rollback

```bash
git checkout metka-7   # до любой фазы
git checkout metka-8   # после фазы 1 (когда появится)
```
