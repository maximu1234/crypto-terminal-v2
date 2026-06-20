# Refactor drawings — план (после metka-9)

**Текущий эталон:** [MARKER_27.md](./MARKER_27.md) (`metka-27`).

**Принцип:** одна фаза = одна метка = [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md) пройден.

## Статус

| Фаза | Задача | Риск | Статус |
|------|--------|------|--------|
| **0** | Чеклист регрессии + autotests `draw-hit` + `check:all` | низкий | ✅ metka-8 |
| **1** | Wire `createDrawHitTester` + `createDrawRenderer` | средний | ✅ metka-8 |
| **2** | Wire `mountTabletDrawInput` из `drawings-tablet-input.js` | средний | ✅ metka-9 |
| **3** | Split `drawings-cloud-sync.js` | высокий | ✅ metka-10 / **metka-11** (prod) |
| **4** | Split `alerts-cloud-sync.js` | высокий | ✅ wired (barrel + `alerts-cloud/*`) |

## Фаза 2 — выполнено (metka-9)

1. `init.js` импортирует `mountTabletDrawInput` из `drawings-tablet-input.js`, дубли tablet input удалены.
2. `npm run check:all` — green.
3. Ручной чеклист: desktop preview + cross-device sync/delete — OK.
4. Tag `metka-9`.

## Фаза 3 — выполнено (`metka-10`)

1. `drawings-cloud-sync.js` — тонкий barrel → `drawings-cloud/sync-lifecycle.js`.
2. Реализация: `sync-lifecycle.js` (init, realtime, sync meta), `worker-client.js` (push/delete), `pull-reconcile.js` (reconcile/pull).
3. `npm run check:all` — green.
4. Desktop регресс — OK; iPad — перед push.
5. Tag `metka-10`.

## Фаза 4 — критерии готовности

1. `alerts-cloud-sync.js` разбит на модули в `alerts-cloud/` (заготовки уже есть).
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
