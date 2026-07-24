# Метка 93 — меню Script/Algo, deep link алертов в desktop (июль 2026)

**Тег:** `metka-93`

## Что вошло

### Настройки → Системные (desktop)

- Чекбоксы **Включить Скрипт** / **Включить АлгоТрейдинг**.
- По умолчанию выключены — пунктов нет в верхнем меню.

### Telegram / deep link → приложение

- `open.html` пробует `multichart://open?…`, затем localhost-handoff, иначе веб.
- Desktop принимает `multichart://open` (Mac `open-url`, second-instance).
- Если Терминал уже открыт — смена тикера через IPC (`desktop:open-chart`).

### Прочее

- Пустой Вотчлист: текст «в Скринере или в Терминале».

## Версии

- Web marker: `v0.93`
- Desktop app: `v1.0.90`
- Mac tag: `desktop-v1.0.90`
- Windows tag: `desktop-win-v1.0.90`
