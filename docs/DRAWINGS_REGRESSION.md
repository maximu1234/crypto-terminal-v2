# Регрессия рисования — чеклист перед wiring (Фаза 0)

**База отката:** `git checkout metka-28` (текущий эталон) или `metka-27`

Проходить **до** и **после** каждой фазы refactor (`draw-hit`, `draw-render`, `drawings-tablet-input`, cloud).

Автотесты: `npm test` + `npm run check:all`

---

## Desktop — `/coins`

### Общее
- [ ] Выбор инструмента: trendline, **arrow**, **rectangle**, fib, hray, channel, long/short
- [ ] Escape / смена инструмента отменяет placement
- [ ] Выделение кликом, контекстное меню, удаление
- [ ] Drag handle p1/p2 (trendline, fib)
- [ ] Drag тела объекта (move)
- [ ] Undo/redraw после смены TF и символа

### Trendline
- [ ] Placement: 2 точки
- [ ] Hit-test по линии (выделение)
- [ ] Edit: перетаскивание якорей

### Fibonacci
- [ ] Placement: 2 точки, уровни между якорями
- [ ] **Edit: якоря вертикально (один X)** — уровни **скрыты**, не на весь экран
- [ ] Edit: нормальный span — уровни между якорями
- [ ] Панель fib: вкл/выкл уровень, цвет, стиль линии
- [ ] Hit-test по горизонтали уровня (не по всей ширине графика)

### Horizontal ray (hray)
- [ ] Placement + drag anchor
- [ ] Hit-test по лучу

### Channel
- [ ] Placement 3 точки + p4 через edit
- [ ] Hit-test по граням

### Position (long/short)
- [ ] Placement, drag TP/SL/entry
- [ ] Risk popover

---

## iPad — `/coins`

### Crosshair / probe (не рисование)
- [ ] Hold → crosshair vert + horiz
- [ ] Release → dock, pan снова работает
- [ ] Tap dismiss — crosshair не прыгает
- [ ] Future area справа — обе линии
- [ ] Scale tap — скрыть «+»; scale hold — invert
- [ ] Desktop: crosshair скрывается на price scale (без залипания vert)
- [ ] Desktop: «+» на plot, не только у шкалы
- [ ] Desktop: RSI — horiz в панели RSI, vert общий; без дубля vert после scale → plot

### Touch-рисование
- [ ] Fib placement двумя тапами/удержаниями
- [ ] Fib edit handle — вертикальные якоря → уровни скрыты
- [ ] Trendline, hray placement
- [ ] Crosshair probe **не конфликтует** с активным инструментом рисования

---

## Terminal — `/terminal`

- [ ] Рисование на виджете (desktop)
- [ ] iPad: tablet gestures на виджете (`tablet-widget-chart.js`)
- [ ] Drawings сохраняются per-widget

---

## Cloud (smoke, не блокирует Фазу 1)

- [ ] Login → drawings sync на `/coins`
- [ ] Logout — local drawings остаются
- [ ] Два браузера: изменение на одном → pull на другом

---

## Автоматические gate (CI / локально)

```bash
npm run check:all
```

Должно быть: syntax OK, manifest OK, nav OK, tests pass.

---

## После фазы — новая метка

| Фаза | Содержание | Метка |
|------|------------|-------|
| 0–3 | чеклист, draw-hit/render, tablet, cloud split | *(архив, тег удалён)* |
| drawings polish | TV color picker, fib settings, long/short | `metka-15` |
| arrow + rectangle | новые инструменты, cloud, icon xl | `metka-16` |
| 4 | `alerts-cloud` split | TBD |
