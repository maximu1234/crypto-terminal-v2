# Метка 149 — Algo Bot lite, LAN-сессия, RSI Touch Flip, desktop 1.1.47

**Тег:** `metka-149`

## Что вошло

- **Standalone Algo Bot:** lite-раскладка без Lightweight Charts и drawings;
  шестерёнка в топбаре; тикеры «Все» через main `listLinearUsdtSymbols` + SOCKS;
  Chromium `persist:multichart-algo-bot` и прокси на window session.
  Дневник на боте скрыт. Graph-sync видит `jsImport()`.
- **Связка Multichart → бот:** после silent refresh JWT снова пушится на LAN
  `POST /auth/session`, если в канале заданы IP и токен. Cloud-lock по-прежнему
  выключен.
- **RSI Touch Flip** бот (движок, книга, MTF, walkforward) в плагине Алго;
  оригинал Pattern 1-2 не менялся.
- HTF project / loader и прочие правки индикаторов в том же дереве.

## Версии

- Web marker: `v0.149`
- Multichart desktop app: `v1.1.47`
- Algo Bot (Windows): `v1.0.154`
