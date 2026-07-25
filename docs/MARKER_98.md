# Метка 98 — Volume/AO fix, Pattern 1-2 pt4 dots, объём в шапке (июль 2026)

**Тег:** `metka-98`

## Что вошло

### Индикаторы Volume / AO

- Фикс `ReferenceError: getHost is not defined` при включении Volume/AO и при refresh свечей.
- `visibleBarsCap` передаётся аргументом в `build*DisplayPoints`, а не через модульный `getHost`.

### Pattern 1-2

- Точка pt4 смещена на 12px от high/low (long выше, short ниже), чтобы не закрывать тень свечи.
- Линия входа без изменений — из точного high/low pt4.
- Правка в оригинале и в алго-копии; после этого оригинал снова заморожен.

### Терминал UI

- Поле активного объёма в шапке уже на 25% (120px → 90px); попап пресетов не тронут.

### Docs

- Gatekeeper на Sequoia: убран устаревший «ПКМ → Открыть»; актуальный путь через Privacy & Security.

## Версии

- Web marker: `v0.98`
- Desktop app: `v1.0.95`
- Mac tag: `desktop-v1.0.95`
- Windows tag: `desktop-win-v1.0.95`
