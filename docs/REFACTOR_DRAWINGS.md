# Refactor drawings — план (после metka-9)

**Текущий эталон:** [MARKER_29.md](./MARKER_29.md) (`metka-29`).

**Принцип:** одна фаза = одна метка = [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md) пройден.

## Статус

| Фаза | Задача | Риск | Статус |
|------|--------|------|--------|
| **0** | Чеклист регрессии + autotests `draw-hit` + `check:all` | низкий | ✅ metka-8 |
| **1** | Wire `createDrawHitTester` + `createDrawRenderer` | средний | ✅ metka-8 |
| **2** | Wire `mountTabletDrawInput` из `drawings-tablet-input.js` | средний | ✅ metka-9 |
| **3** | Split `drawings-cloud-sync.js` | высокий | ✅ metka-10 / **metka-11** (prod); модуль позже удалён (облако рисунков отключено) |
| **4** | Split `alerts-cloud-sync.js` | высокий | ✅ wired (barrel + `alerts-cloud/*`) |

## Фаза 2 — выполнено (metka-9)

1. `init.js` импортирует `mountTabletDrawInput` из `drawings-tablet-input.js`, дубли tablet input удалены.
2. `npm run check:all` — green.
3. Ручной чеклист: desktop preview + cross-device sync/delete — OK.
4. Tag `metka-9`.

## Фаза 3 — выполнено (`metka-10`), модуль удалён

Исторически: `drawings-cloud-sync.js` был тонким barrel → `drawings-cloud/{sync-lifecycle,worker-client,pull-reconcile}.js` (`metka-10` / prod `metka-11`). Позже облако рисунков отключили — barrel и `drawings-cloud/*` удалены из репозитория.

## Фаза 4 — выполнено

1. `alerts-cloud-sync.js` разбит на модули в `alerts-cloud/`.
2. `npm run check:all` — green.
3. Cross-device delete/create алертов.
4. Tag `metka-11` (или следующий по плану alerts).

- Big-bang: все модули в одном PR.
- Новые фичи рисования параллельно с wiring.
- Удалять `draw-hit.js` / `draw-render.js` до wiring (потеря подготовленного кода).

## Rollback

```bash
git checkout metka-16  # текущий эталон
git checkout metka-15  # до arrow / rectangle
```
