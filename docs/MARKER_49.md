# Метка 49 — iPad рисование, Volume viewport, tray (июль 2026)

**Тег:** `metka-49` · **Веб:** `v0.49` · **Desktop:** `desktop-v1.0.43` → `v1.0.43`

**Предыдущий эталон:** [MARKER_48.md](./MARKER_48.md) (`metka-48` / `desktop-v1.0.42`).

## Релиз

| Компонент | Описание |
|-----------|----------|
| Volume | Корректный viewport графика при включённом индикаторе Volume |
| Облако флагов | Ручное «Обновить» в настройках не блокируется BANDWIDTH-CUT |
| Алерты | «Удалить все рисунки» не трогает алерты |
| iPad рисование | Кисть пальцем; блок лупы и системного меню Safari при рисовании |
| Desktop tray | Popup menu bar не прыгает при обновлении PnL |
| Desktop CI | Release через Actions (без ручного push тега) |

## Desktop DMG

1. Push `main` через GitHub Desktop.
2. GitHub → **Actions** → **Desktop release (macOS)** → **Run workflow**.
3. Поле `desktop_version`: **`1.0.43`** (совпадает с `release-marker.js` и `desktop/package.json`).
4. Дождаться зелёного run → **Releases** → **Desktop 1.0.43** (`.dmg` + `.zip`).

Альтернатива (если тег уже на GitHub): push тега `desktop-v1.0.43` — workflow стартует автоматически.

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Volume viewport | `js/indicators/volume-pane.js`, `js/terminal/terminal-chart-layout.js`, `js/chart/chart-factory.js` |
| iPad draw | `js/chart-tablet-gestures.js`, `js/drawings/init.js`, `js/drawings/brush-placement.js` |
| Флаги / алерты | `js/favorites-cloud-sync.js`, `js/alerts.js` |
| Tray | `desktop/menu-bar-tray.cjs` |
| Desktop release | `.github/workflows/desktop-release.yml` |
| `release-marker.js` | METKA 49 / desktop 1.0.43 |
