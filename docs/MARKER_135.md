# Метка 135 — Pattern 1-2: фиксация сетапа после точки 4 (август 2026)

**Тег:** `metka-135`

## Что вошло

- **Паттерн 1-2:** после валидной точки 4 цепочка 1-2-3-4 фиксируется
  (append-only). Более низкий/высокий swing после `b4` — новый сетап, а не
  перепись старой тройки. Исправляет недоучёт в статистике и на графике
  (сетап уже был валиден для входа, уход ниже т.3 = СЛ).
- Копии: оригинал `js/indicators`, алго `js/algo-trading`, pack
  `Pattern-12-1-2` (+ Pine TradingView), бандлы Multichart / Algo Bot.
- **Дефолты настроек** как в рабочих пресетах: точек перед т.1 = 0,
  волна А RSI = 17, волна 1 оф С RSI = 1, волна 1 оф С = 1 микро (L/S).

## Версии

- Web marker: `v0.135`
- Multichart desktop app: `v1.1.35`
- Algo Bot desktop app: `v1.0.146`
- Mac tag (Multichart): `desktop-v1.1.35`
- Windows tag (Multichart): `desktop-win-v1.1.35`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.146`
