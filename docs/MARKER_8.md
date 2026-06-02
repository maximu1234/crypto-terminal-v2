# Метка 8 — стабильная сборка (июнь 2026)

**Тег:** `metka-8` · **Коммит:** `git rev-parse metka-8`

**Текущий эталон отката.** Наследует [MARKER_7.md](./MARKER_7.md); всё из metka-7 + исправления ниже.

Проверено: desktop + iPad (prod Vercel), рисунки и алерты — создание, sync, удаление на любом устройстве.

## Что добавлено после metka-7

### Рисование (refactor фаза 0–1)
- Чеклист [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md), autotests `draw-hit`
- `draw-hit.js` + `draw-render.js` подключены к `drawings/init.js`
- Fix: `isPointerInPriceGutter` — перетаскивание объектов на desktop

### Cloud sync — рисунки
- `POST /delete-drawing` на alert-worker (service role)
- Локальный dev: Bybit через `/api/bybit`, не Railway (403)
- Reconcile: tombstone не сбрасывается при pending delete

### Cloud sync — алерты
- Cross-device delete: worker проверяет `deleted > 0`, fallback symbol+shape_id
- Тихий alerts pull: coalesce, реже poll в Yandex, без spam в консоли

## Страницы

| URL | Boot | Prod |
|-----|------|------|
| `/` | `screener.js` + `site-boot.js` | 200 |
| `/coins` | `coins-page-boot.js` → `chart-page.js` → `terminal.js` | 200 |
| `/terminal` | `dashboard.js` | 200 |
| `/alerts` | `alerts-page.js` | 200 |
| `/listings`, `/trade-calculator`, `/system` | page JS + `site-boot.js` | 200 |

## Аудит (2026-06-02)

| Проверка | Результат |
|----------|-----------|
| `npm run check:all` | OK |
| Рисунки: create / move / delete (desktop + iPad) | OK |
| Алерты: create / delete cross-device | OK |
| Локальный `./start.sh` — графики без Railway 403 | OK |

## Следующий шаг refactor

**Фаза 2:** wire `drawings-tablet-input.js` — см. [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md).

## Откат

```bash
git fetch --tags
git checkout metka-8
```

До refactor фазы 1:

```bash
git checkout metka-7
```
