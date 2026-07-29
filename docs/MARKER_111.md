# Метка 111 — Algo Bot opposite-mirror по спискам long/short (июль 2026)

**Тег:** `metka-111`

## Что вошло

### Algo Bot — opposite-mirror (уточнение)

- Пока родительский сетап жив в box, противоположную сторону не вооружаем.
- Исключение: `pt4` opposite = `pt3` родителя (цена + время бара) → armed opposite («mirror»).
- Триггер/алерт: ±1 `tickSize` от пивота (short ниже, long выше). **SL/TP** — от оригинальных `pt3/pt4` паттерна.
- Симметрия long↔short; списки Алго-лонг / Алго-шорт (`symbolAllowedSides`) не обходятся.
- Live: два pending на символ (основной + mirror); fill снимает sibling; cancel parent по pt3 — mirror остаётся.
- Manual: у mirror алерт на tick-триггере без lead к pt3 (чтобы не съедать зазор).
- Same-side nested — без изменений.

### Версии

- Web marker: `v0.111`
- Multichart desktop app: `v1.1.9`
- Mac tag (Multichart): `desktop-v1.1.9`
- Windows tag (Multichart): `desktop-win-v1.1.9`
- Algo Bot desktop app: `v1.0.116`
- Mac tag (Algo Bot): `algo-bot-v1.0.116`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.116`
