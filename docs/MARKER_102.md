# Метка 102 — облачная блокировка АлгоБота + standalone Algo Bot (июль 2026)

**Тег:** `metka-102`

## Что вошло

### Облачная блокировка бота (Multichart + Algo Bot)

- Перед «Запустить» — метка в Supabase (`algo_bot_lock`); чужая метка → отказ.
- «Остановить» снимает свою метку.
- В «Статус»: строка «Блокировка» + кнопка **Снять блокировку**.
- Миграция v1: `supabase/migration-algo-bot-lock.sql` (устарела).
- Миграция v2: `supabase/migration-algo-bot-lock-v2.sql` — ключ `lock_key` = SHA-256 алго API-ключа (без логина Multichart).

### Standalone Algo Bot (`bot-app/`)

- Отдельное Electron-приложение только с АлгоТрейдингом (без графика).
- Верстка: верх 2 колонки (Паттерн 1-2 + global setup), низ 3 стратегии; справа список монет.
- Релизы: `algo-bot-v1.0.99` / `algo-bot-win-v1.0.99`; fix lock без логина — `algo-bot-v1.0.100` / `algo-bot-win-v1.0.100`.

### Desktop

- Windows chart snapshot crop (`chart-snapshot-win.cjs`).
- Desktop `1.1.1`: облачная блокировка по хешу алго-ключей (кросс-блокировка с Algo Bot).

## Версии

- Web marker: `v0.102`
- Desktop app: `v1.1.1`
- Mac tag: `desktop-v1.1.1`
- Windows tag: `desktop-win-v1.1.1`
- Algo Bot Mac: `algo-bot-v1.0.100`
- Algo Bot Windows: `algo-bot-win-v1.0.100`
