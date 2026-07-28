# Метка 107 — remote start/stop Algo Bot + lock по аккаунту (июль 2026)

**Тег:** `metka-107`

## Что вошло

### Remote start/stop

- Algo Bot на VPS держит исходящий WebSocket к alert-worker.
- Multichart на Mac: в «Статус» блок «Удалённый бот» — online/running + Запустить/Остановить.
- Команды: Multichart → worker HTTP → push в WS бота (без открытых портов на VPS).

### Блокировка без «алго-ключей»

- Cloud lock только по аккаунту Multichart (`user:<id>`), не по биржевым/алго API-ключам.
- Обычный Multichart без удалённого бота не требует никаких «ключей блокировки».
- Один аккаунт: либо локальный бот, либо серверный — взаимное исключение.

### Alert-worker

- `not_claimed`: тихий `already handled`, алерт снимается из памяти (без красного спама).
- `WORKER_BUILD`: `2026-07-29-bot-remote-v1`.

### Версии

- Web marker: `v0.107`
- Desktop app: `v1.1.6`
- Mac tag: `desktop-v1.1.6`
- Windows tag: `desktop-win-v1.1.6`
- Algo Bot Mac: `algo-bot-v1.0.110`
- Algo Bot Windows: `algo-bot-win-v1.0.110`
