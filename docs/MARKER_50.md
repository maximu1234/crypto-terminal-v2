# Метка 50 — панель алертов, ордера grid, UX алертов (июль 2026)

**Тег:** `metka-50` · **Веб:** `v0.50` · **Desktop:** `desktop-v1.0.44` → `v1.0.44`

**Предыдущий эталон:** [MARKER_49.md](./MARKER_49.md) (`metka-49` / `desktop-v1.0.43`).

## Релиз

| Компонент | Описание |
|-----------|----------|
| Панель позиций | Фон `#1b1a26`, шрифт/межстрочный как список монет |
| Панель ордеров | Grid с ресайзом колонок; типы SST/SLT/BST/BLT |
| Панель алертов | «Активные» и «Исполненные» в выпадающем меню; дата / тикер / × |
| Страница Алерты | Крестики вместо чекбоксов; дата `DD.MM.YY`; красный × «удалить все» |
| График /trade | Нет мигания линий ордеров и SL/TP при смене монеты |
| Desktop CI | Release через Actions → Run workflow (`desktop_version`) |

## Desktop DMG

1. Push `main` через GitHub Desktop.
2. GitHub → **Actions** → **Desktop release (macOS)** → **Run workflow**.
3. Поле `desktop_version`: **`1.0.44`**.
4. Дождаться зелёного run → **Releases** → **Desktop 1.0.44**.

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Trade book | `js/trade-book-panel.js`, `js/trade-book-columns.js`, `css/trade-book-panel.css` |
| Алерты | `js/alerts.js`, `js/alerts-page.js`, `css/alerts.css`, `alerts/index.html` |
| График overlay | `js/trade-chart-orders.js`, `js/trade-chart-overlay.js` |
| Ордера desktop | `desktop/trading/bybit-rest.cjs` |
| `release-marker.js` | METKA 50 / desktop 1.0.44 |
