# Метка 104 — сессия Multichart → Algo Bot + Vol в списках (июль 2026)

**Тег:** `metka-104`

## Что вошло

### Импорт сессии для алертов Algo Bot

- Без новых таблиц Supabase: та же `auth.users`-сессия.
- Multichart: «Скопировать сессию для Algo Bot» (clipboard, `mcauth1.…`).
- Algo Bot: шестерёнка в topbar (header скрыт в lite) → вставить сессию → `saveAuthSession` + `setSession`.
- Нужен Telegram Chat ID на том же аккаунте (настраивается в Multichart).

### Список монет / объём

- Колонка Vol (24h) вместо 1h; формат `2.4M` / `598.73K`.
- Фикс пустого списка в bot-app: выровнены `?v=` у `terminal-state` / prefs / table (один ESM-инстанс `coinsState`).
- Фильтр объёма на Скрипте; poll без лишнего remount виджетов.

### Algo Bot store

- Pref `minTurnover24hUsdt` сохраняется в store (раньше терялся при normalize).

### Версии

- Web marker: `v0.104`
- Desktop app: `v1.1.3`
- Mac tag: `desktop-v1.1.3`
- Windows tag: `desktop-win-v1.1.3`
- Algo Bot Mac: `algo-bot-v1.0.102`
- Algo Bot Windows: `algo-bot-win-v1.0.102`
