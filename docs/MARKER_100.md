# Метка 100 — скриншот графика, BingX 24h/klines, маркеры истории (июль 2026)

**Тег:** `metka-100`

## Что вошло

### Терминал — скриншот графика (desktop)

- После «Индикаторы»: разделитель + **Копировать** / **Сохранить PNG**.
- Область: `#charts-stack-panes` (свечи + шкала + индикаторы).
- На скрине плашка `Тикер - Биржа` (например `BTCUSDT.P - BingX`).
- PNG через диалог «Сохранить как…».

### BingX — свечи и 24h %

- Klines: `v2` → `v3`; обработка `100410` (временный бан endpoint).
- Swap-тикер сейчас отдаёт «минутный» open → ~0% за 24h.
- Fallback: при ненадёжном окне swap — spot `/ticker/24hr`; когда BingX починит swap — снова swap без смены кода.
- Статистика: `fetchDailyCandles` для BingX; ниже concurrency на BingX.

### История сделок на графике

- При включении чекбокса — жёлтая надпись **Поиск…** слева.
- Выключение во время поиска отменяет результат: маркеры не появляются.

### Прочее

- Full market-reduce: убрать ghost позиции (IPC + cache Bybit/BingX).
- Bybit reduce: явный opposite side.
- Чистка логов / мёртвого BANDWIDTH-CUT кода; docs; `.venv-icons` убран из git index.

## Версии

- Web marker: `v0.100`
- Desktop app: `v1.0.97`
- Mac tag: `desktop-v1.0.97`
- Windows tag: `desktop-win-v1.0.97`
