# Метка 102 — облачная блокировка АлгоБота + standalone Algo Bot (июль 2026)

**Тег:** `metka-102`

## Что вошло

### Облачная блокировка бота (Multichart + Algo Bot)

- Перед «Запустить» — метка в Supabase (`algo_bot_lock`); чужая метка → отказ.
- «Остановить» снимает свою метку.
- В «Статус»: строка «Блокировка» + кнопка **Снять блокировку**.
- Миграция: `supabase/migration-algo-bot-lock.sql` (выполнить в SQL Editor).

### Standalone Algo Bot (`bot-app/`)

- Отдельное Electron-приложение только с АлгоТрейдингом (без графика).
- Верстка: верх 2 колонки (Паттерн 1-2 + global setup), низ 3 стратегии; справа список монет.
- Разовый релиз: теги `algo-bot-v1.0.99` (Mac), `algo-bot-win-v1.0.99` (Windows).

### Desktop

- Windows chart snapshot crop (`chart-snapshot-win.cjs`).

## Версии

- Web marker: `v0.102`
- Desktop app: `v1.0.99`
- Mac tag: `desktop-v1.0.99`
- Windows tag: `desktop-win-v1.0.99`
- Algo Bot Mac: `algo-bot-v1.0.99`
- Algo Bot Windows: `algo-bot-win-v1.0.99`
