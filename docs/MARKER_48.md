# Метка 48 — tray polish, fib fill, позиции UX (июль 2026)

**Тег:** `metka-48` · **Веб:** `v0.48` · **Desktop:** `desktop-v1.0.42` → `v1.0.42`

**Предыдущий эталон:** [MARKER_47.md](./MARKER_47.md) (`metka-47` / `desktop-v1.0.41`).

## Релиз

| Компонент | Описание |
|-----------|----------|
| Desktop tray | Popup: клик вне закрывает, Dock не пропадает, hide-on-close, авто-высота по позициям |
| Настройки | «Системные» — переключатель иконки menu bar |
| Desktop build | `menu-bar-tray.cjs`, tray-popup, PnL share script/templates в `extraResources` |
| Фибоначчи | Фоновая заливка между уровнями (`fillBg`), настройки UI |
| Позиции | График только по клику на тикер; PnL/share/× без перехода |
| Fib / tray | Прозрачность заливки ~0.074 |

## Desktop DMG

```bash
git tag desktop-v1.0.42
git push origin desktop-v1.0.42
```

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Tray | `desktop/menu-bar-tray.cjs`, `desktop/tray-popup.*` |
| Fib | `js/drawings/fib-spec.js`, `draw-render.js`, `draw-style-bar.js` |
| Позиции | `js/trade-book-panel.js` |
| PnL share | `desktop/trading/pnl-share-card.cjs`, `desktop/package.json` |
| `release-marker.js` | METKA 48 / desktop 1.0.42 |
