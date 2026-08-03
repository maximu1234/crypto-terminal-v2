# Метка 126 — perf + Algo deepen + lite JWT + scale labels (август 2026)

**Тег:** `metka-126`

## Что вошло

- **Глобальный perf:** concurrency сетки, deferred Terminal chrome, virtual
  coin list (scroll root Trade/Algo), `loadMarketHistory` inflight + `endMs`,
  `format-price` / `load-concurrency` / `perf-marks`.
- **Алготрейдинг:** быстрые 5k → deepen только старшие 5k; «Данные» — прочерки
  до полной глубины; без мигания линий позиций на deepen; scene-cache Pattern-12
  (копия, оригинал не тронут).
- **Algo Bot lite JWT:** контролируемый near-expiry refresh
  (`refreshSessionDirect`) + single-flight + circuit-breaker; без getSession.
- **LAN remote Start:** выбор Ст1/Ст2/Ст3; fresh JWT на «Отдать сессию».
- **Watchlist scale labels:** провайдеры шкалы scoped по chart (без чужих
  красных плашек между виджетами).

## Версии

- Web marker: `v0.126`
- Multichart desktop app: `v1.1.26`
- Algo Bot desktop app: `v1.0.135`
- Mac tag (Multichart): `desktop-v1.1.26`
- Windows tag (Multichart): `desktop-win-v1.1.26`
- Mac tag (Algo Bot): `algo-bot-v1.0.135`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.135`
