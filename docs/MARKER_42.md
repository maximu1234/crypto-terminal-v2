# Метка 42 — tablet drawing UX, cloud reconcile fix (июнь 2026)

**Тег:** `metka-42` · **Desktop:** `desktop-v1.0.34` (DMG)

**Текущий эталон отката.** Предыдущий: [MARKER_41.md](./MARKER_41.md) (`metka-41` / `desktop-v1.0.33`).

Проверено: `npm run check:all`, `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/terminal`: trade boot только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| `body.trade-page` только desktop | ✅ |
| Trade init — lazy `trade-desktop-boot` / gate `isDesktop` | ✅ |
| Position «Применить» — только `trade-page` + `isDesktop` | ✅ |
| Bybit private WS / trading IPC — только Electron main | ✅ |

## Что вошло после metka-41

### iPad / смартфон — рисование

| Компонент | Описание |
|-----------|----------|
| Сохранение | `saveDrawings` на pagehide/visibility; не purge локальных при пустом облаке |
| Выделение | Pin на touch; style bar без desktop-only pin; `pointerleave` не снимает |
| Опорные точки | На touch — только обводка кружка/квадрата, без чёрной заливки |
| Long/Short Apply | Скрыта вне desktop-приложения |

### Облако / стабильность

| Компонент | Описание |
|-----------|----------|
| pull-reconcile | Фикс синтаксиса (missing `}`) — терминал не грузился на mobile |
| Reconcile | Локальные рисунки push в облако вместо purge при пустом Supabase |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=42, desktop=1.0.34 |
| `drawings/init.js` | 121+ |
| `drawings-cloud/pull-reconcile.js` | 10 |
| `drawings-cloud-sync.js` | 45 |
| `desktop/package.json` | 1.0.34 |

## Откат

```bash
git fetch --tags
git checkout metka-42   # текущий
git checkout metka-41   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| iPad / iPhone web | Терминал грузится; рисунки сохраняются после навигации |
| iPad / iPhone | Тап по объекту — меню остаётся после отпускания |
| iPad / iPhone | Опорные точки — кольцо без чёрного фона |
| Desktop `/terminal` | Apply у Long/Short только в .app |
| Desktop Dock | v0.42 / v1.0.34 |

## Теги

```bash
git tag -a metka-42 -m "metka-42: tablet drawing UX, cloud reconcile fix"
git tag -a desktop-v1.0.34 -m "desktop-v1.0.34: bundled UI metka-42"
```
