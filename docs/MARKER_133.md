# Метка 133 — облачный remote off + кэш бэктеста (август 2026)

**Тег:** `metka-133`

## Что вошло

- **Algo / Multichart:** отключена облачная удалёнка Multichart↔бот (Status poll /
  worker WS / передача сессии / `algo_bot_lock`). Auth egress от remote больше
  не генерируется. Канал удалёнки — только **LAN**.
- **Algo (Данные):** окно бэктеста «Топ-100» / «на всех» помнит последний
  успешный прогон по слоту стратегия×universe до перезапуска приложения;
  «Запустить» пересчитывает.
- **Algo UI:** в агрегатах бэктеста подпись **Б/У** вместо BE (безубыток).

## Версии

- Web marker: `v0.133`
- Multichart desktop app: `v1.1.33`
- Algo Bot desktop app: `v1.0.144`
- Mac tag (Multichart): `desktop-v1.1.33`
- Windows tag (Multichart): `desktop-win-v1.1.33`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.144`
