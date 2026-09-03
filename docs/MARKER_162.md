# Метка 162 — RSI Flip isolated на Unified-аккаунте Bybit

**Тег:** `metka-162`

## Что вошло

- **Live RSI Touch Flip:** на Unified (UTA) бот больше не вызывает
  `/v5/position/switch-isolated` (Bybit отвечает `unified account is forbidden`
  и вход пропускался). Isolated/cross ставится через
  `/v5/account/set-margin-mode` на UID ключей Algo Bot (субаккаунт не трогает
  мастер).
- Классический аккаунт по-прежнему использует `switch-isolated` по символу.

Оригинал Pattern 1-2 не менялся.

## Версии

- Web marker: `v0.162`
- Multichart desktop app: `v1.1.61`
- Algo Bot standalone: `v1.0.168` (`algo-bot-win-v1.0.168`)
