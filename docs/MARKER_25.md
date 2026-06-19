# Метка 25 — рабочая версия (июнь 2026)

**Тег:** `metka-25` · **Коммит:** `git rev-parse metka-25`

**Предыдущий эталон отката.** Текущая: [MARKER_26.md](./MARKER_26.md) (`metka-26`).

## Что добавлено после metka-24

### Рисунки — init.js phase 3: persist
- Новый модуль `drawings/drawings-persist.js` (~544 строк)
- `createDrawingsPersist()` — load/save, normalize, legacy TF migration
- `drawings/init.js`: **12 800 → 12 392** строк (−408)

## Откат

```bash
git checkout metka-26   # текущий эталон
git checkout metka-25   # persist phase 3
```
