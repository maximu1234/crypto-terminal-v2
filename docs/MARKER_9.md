# Метка 9 — стабильная сборка (июнь 2026)

**Тег:** `metka-9` · **Коммит:** `git rev-parse metka-9`

**Текущий эталон отката.** Наследует [MARKER_8.md](./MARKER_8.md); всё из metka-8 + фаза 2 refactor и исправления ниже.

Проверено: desktop + iPad — рисунки создаются, синхронизируются и **удаляются** на любом устройстве; промежуточная прорисовка (trendline / fib / channel) на desktop.

## Что добавлено после metka-8

### Refactor фаза 2 — tablet input
- `mountTabletDrawInput` из `drawings-tablet-input.js` подключён к `drawings/init.js`
- ~400 строк дублирующего tablet-кода удалены из `init.js`
- `npm run check:all` — green

### Fix — preview при рисовании (desktop)
- Вернён импорт `hideDomChartCrosshair` в `init.js` (сломался при выносе tablet-модуля)
- Пока ведёте мышь ко 2-й точке — видна «резиновая» линия / растягивающаяся fib / канал

### Fix — удаление рисунков cross-device (desktop)
- Reconcile: grace только для **локального push** (`push_pending`, ~10 с), не блокирует удаление с iPad
- Realtime broadcast при delete: `{ symbol, shapeId }` → мгновенное снятие с графика на других устройствах
- Fingerprint refresh: обновляются все символы (local + cloud), не только те, что остались в Supabase

### Версии ассетов
- `drawings/init.js?v=28`
- `drawings-cloud-sync.js?v=38`
- `drawings-tablet-input.js?v=2`

## Аудит (2026-06-03)

| Проверка | Результат |
|----------|-----------|
| `npm run check:all` | OK |
| Рисунки: create / preview / delete (desktop) | OK |
| Рисунки: create / sync / delete (desktop ↔ iPad) | OK |
| Tablet: жесты рисования (Phase 2 wiring) | OK (локально) |

## Следующий шаг refactor

**Фаза 3:** split `drawings-cloud-sync.js` — см. [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md).

## Откат

```bash
git fetch --tags
git checkout metka-9
```

До фазы 2 (tablet wiring):

```bash
git checkout metka-8
```
