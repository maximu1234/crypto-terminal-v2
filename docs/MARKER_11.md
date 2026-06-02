# Метка 11 — стабильная прод-сборка (июнь 2026)

**Тег:** `metka-11` · **Коммит:** `git rev-parse metka-11`

**Текущий эталон отката.** Наследует [MARKER_10.md](./MARKER_10.md) / [MARKER_9.md](./MARKER_9.md).

Проверено на **prod** (`crypto-terminal-v2.vercel.app`): рисунки, sync, консоль без ошибок; desktop worker fix (REST напрямую, без лишних запросов на Railway).

## Что добавлено после metka-10

### Fix — консоль на desktop (drawings push)
- Worker `/push-drawing` вызывается только на **iPad Safari**; desktop идёт сразу в Supabase REST
- Ошибки worker → `drawingsDebugLog` (не засоряют консоль при успешном fallback)

### Аудит и чистка
- Синхронизация `?v=` с manifest: `pull-reconcile.js`, `fib-portals.js`, `init.js`
- `check-asset-manifest.cjs` — резолв `../` импортов (ловит stale cache раньше)
- Удалён мёртвый `refreshTelegramRestAuth` из `alerts-cloud/worker-client.js` (prep фазы 4)
- `js/alerts-cloud/README.md` — модули alerts **не wired**
- Обновлены [ARCHITECTURE.md](./ARCHITECTURE.md), [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md)

### Версии ассетов (drawings)
- `drawings-cloud-sync.js?v=41`
- `drawings-cloud/sync-lifecycle.js?v=6`, `worker-client.js?v=6`, `pull-reconcile.js?v=6`
- `drawings/init.js?v=29`, `drawings/fib-portals.js?v=3`, `drawings/fib-spec.js?v=9`
- `drawings-storage.js?v=7`, `alerts-cloud-sync.js?v=107`

## Аудит (2026-06-03)

| Проверка | Результат |
|----------|-----------|
| `npm run check:all` | OK |
| Asset manifest + site nav | OK |
| Unit tests (draw-hit, fib-spec, …) | 14/14 |
| Рисунки: create / preview / delete (desktop) | OK |
| Рисунки: sync (prod desktop) | OK |
| Консоль prod (без worker noise) | OK |
| iPad cross-device | smoke — по возможности после деплоя |

## Следующий шаг

- **Фаза 4:** split `alerts-cloud-sync.js` (модули в `alerts-cloud/` — см. README там)
- Или **новые фичи** графика — refactor drawings закрыт

## Откат

```bash
git fetch --tags
git checkout metka-11   # текущий эталон
git checkout metka-10   # после фазы 3, до desktop worker fix
git checkout metka-9    # монолит drawings-cloud, до split
```
