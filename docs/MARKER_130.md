# Метка 130 — Algo arm/prefs + Script Live zoom/log (август 2026)

**Тег:** `metka-130`

## Что вошло

- **Algo Bot / Multichart:** фильтр «бары pt1→pt4» — пусто = без лимита, любое
  число (включая 1000) = лимит; убран костыль «1000 = unlimited»; cancel
  `max_pt1_pt4` вместо ложного «пропущен вход».
- **Multichart:** окно «Логи» для локальных session `.log` файлов бота.
- **Скрипт:** при Скринер Live грид виджетов очищается (находки только в логе);
  в зум-окне лога Пробел/←/→ листают результаты по кругу.
- **Algo Bot:** stub `bot-session-logs-viewer` восстановлен (не Multichart LAN).
- Прочее WIP: time-based armed timeout (`b4Time`), temp cloud-lock off,
  MAX_LOG 500, LAN `strategyPrefs` на старте.

## Версии

- Web marker: `v0.130`
- Multichart desktop app: `v1.1.30`
- Algo Bot desktop app: `v1.0.141`
- Mac tag (Multichart): `desktop-v1.1.30`
- Windows tag (Multichart): `desktop-win-v1.1.30`
- Mac tag (Algo Bot): `algo-bot-v1.0.141`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.141`
