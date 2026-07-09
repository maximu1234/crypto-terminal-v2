# Метка 60 — desktop Mac/Win, торговля, скрипт, дневник (июль 2026)

**Тег:** `metka-60`

## Что вошло

### Desktop Mac / Windows
- Платформенная изоляция: `desktop/platform/{index,darwin,win32,shared}.cjs`, `js/desktop/platform.js`.
- Windows PnL-share: `desktop/trading/pnl-share-card-win.cjs`, Python `py`/`python`, проверка шаблона.
- CI: pipeline `desktop-win-v*` для сборки `.exe`.
- Правило `.cursor/rules/desktop-platform.mdc`.

### Алерты и облако
- Флаги/рисунки не подтягиваются автоматически; alerts fallback 30 мин.
- Pull рисунков/алертов на `chart-candles-loaded`; realtime `triggered_at` на графике.

### Торговля (desktop)
- Горячие клавиши: `T` long, `Y` short, `⌥D` / `Alt+D` закрыть позицию на активном графике.
- Позиция Long/Short: **Enter** в поле стоп-лосса = кнопка «Применить».
- Терминал: счётчик тикеров в заголовке колонки `Symbol (N)`.
- Windows: мгновенное скрытие PnL по иконке глаза в книге позиций.

### Скрипт (desktop)
- Убрана кнопка «Обновить все таймфреймы» — только скан по критериям.

### Дневник (desktop)
- Доступ только в desktop-приложении; без owner/email-ограничений (Bybit API keys).

### Версии
- Web marker: `v0.60`
- Desktop app: `v1.0.53` (Mac `.dmg` → `desktop-v1.0.53`, Win `.exe` → `desktop-win-v1.0.53`)
