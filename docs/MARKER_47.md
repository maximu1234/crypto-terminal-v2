# Метка 47 — macOS menu bar tray, терминал 3 графика, оверлей смены монеты (июль 2026)

**Тег:** `metka-47` · **Веб:** `v0.47` · **Desktop:** `desktop-v1.0.41` → `v1.0.41`

**Предыдущий эталон:** [MARKER_46.md](./MARKER_46.md) (`metka-46` / `desktop-v1.0.40`).

## Релиз

| Компонент | Описание |
|-----------|----------|
| Desktop macOS | Иконка в menu bar: суммарный PnL + popup (баланс, позиции live, цветной PnL) |
| Настройки | Раздел «Системные» — переключатель видимости tray |
| Терминал | Раскладка 3 графика (большой слева), DOM-перекрестье на доп. виджетах |
| Торговый оверлей | Veil при смене монеты — SL/TP/ордера не «переезжают» на новый график |
| Звуки позиций | Baseline по ключам позиций — нет ложного open при старте |
| Скролл | Алерты / Статистика / Листинги — `overflow` только у screener-grid |
| Desktop UX | Закрытие окна → hide (tray + PnL живут); Dock не пропадает при popup |

## Desktop DMG

```bash
git tag desktop-v1.0.41
git push origin desktop-v1.0.41
```

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Menu bar | `desktop/menu-bar-tray.cjs`, `js/desktop-menu-bar-tray.js` |
| Настройки tray | `js/app-settings-system-panel.js`, `js/desktop-menu-bar-tray-prefs.js` |
| Оверлей смены | `js/trade-chart-overlay.js`, `js/trade-chart-orders.js`, `js/terminal.js` |
| `release-marker.js` | METKA 47 / desktop 1.0.41 |
