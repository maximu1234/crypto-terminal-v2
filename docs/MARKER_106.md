# Метка 106 — дневник быстрее + opposite-mirror в алго (июль 2026)

**Тег:** `metka-106`

## Что вошло

### Дневник — быстрый список

- Bybit: list-refresh с `skipExecutions` — тяжёлые executions только в detail строки.
- BingX: list-refresh с `skipEnrich` — income сразу, enrich не блокирует first paint.

### Algo Bot — opposite-mirror

- Пока родительский сетап жив в box, opposite не вооружается.
- Исключение: `pt4` opposite = `pt3` родителя (цена + время бара) → armed opposite («mirror»).
- Триггер/алерт: ±1 `tickSize` от общего пивота (short ниже, long выше). **SL/TP** — от оригинальных `pt3/pt4` паттерна.
- Симметрия long↔short; `symbolAllowedSides` (списки Алго-лонг/шорт) не обходится.
- Live: два pending на символ (основной + mirror); fill снимает sibling; cancel parent по pt3 — mirror остаётся.
- Same-side nested — без изменений (live replace / manual multi-alert).

### Bybit REST (algo)

- `recv_window` 20с, sync времени с биржей, один retry на timestamp/recv_window.

### Версии

- Web marker: `v0.106`
- Desktop app: `v1.1.5`
- Mac tag: `desktop-v1.1.5`
- Windows tag: `desktop-win-v1.1.5`
- Algo Bot Mac: `algo-bot-v1.0.109`
- Algo Bot Windows: `algo-bot-win-v1.0.109`
