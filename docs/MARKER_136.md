# Метка 136 — стакан Worker, Supertrend, IPC (август 2026)

**Тег:** `metka-136`

## Что вошло

- **Стакан:** книга в Worker, canvas-лестница, `orderbook.200`, REST только
  как resync — без опроса каждые 20 с.
- **Индикаторы:** Supertrend сегментами (без склейки через разрывы), MACD,
  текстовый инструмент рисования.
- **Паттерн 1-2:** в оригинале только `tempFastPt4`; алго-копия держит
  confirm/setup extras. Скринер/Скрипт сканируют `setups[]`.
- **Алго:** фильтр EMA заменён на Supertrend; optimize по вселенной;
  session-log на `127.0.0.1`, токен только в `Authorization`.
- **Desktop IPC:** торговля только с trusted local UI; auth-session тем же
  gate. BingX auto-stops больше не читает ключ Bybit.
- **Bybit PnL:** обрезан белый QR-подвал (BingX не трогали).
- **Algo Bot:** движок синхронизирован, lite HTML/CSS/stub логов сохранены.

## Версии

- Web marker: `v0.136`
- Multichart desktop app: `v1.1.36`
- Mac tag: `desktop-v1.1.36`
- Windows tag: `desktop-win-v1.1.36`
