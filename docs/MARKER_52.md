# Метка 52 — паттерн 1-2, точка отката (июль 2026)

**Тег:** `metka-52` · **Веб:** `v0.52` · **Desktop:** `v1.0.45` (без нового .dmg)

**Предыдущий эталон:** [MARKER_51.md](./MARKER_51.md) (`metka-51` / `desktop-v1.0.45`).

## Зачем

Контрольная метка **перед опасными изменениями**. Откат: `git checkout metka-52`.

## Состояние

| Компонент | Описание |
|-----------|----------|
| Индикатор | **Паттерн 1-2, 1-2** — overlay на графике терминала, полное окно настроек (как Pine) |
| База | Всё из metka-51: BingX, worker egress probe, trade UX, рисование, watchlist HUD |

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Паттерн | `js/indicators/pattern-12.js`, `js/indicators/pattern-12-math.js` |
| Меню индикаторов | `js/chart-indicators.js`, `css/chart-indicators.css` |
| `release-marker.js` | METKA 52 |

## Откат

```bash
git checkout metka-52
# или
git reset --hard metka-52   # только если уверены
```
