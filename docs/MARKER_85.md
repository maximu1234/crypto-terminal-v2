# Метка 85 — Win tray/keys, chart viewport, алерты бота (июль 2026)

**Тег:** `metka-85`

## Что вошло

### Desktop Windows

- Сохранение алго-ключей: decrypt-first в `user-store` (Win encrypted blobs).
- Tray agent: иконка в области уведомлений, close → agent, login с `--agent`.

### АлгоТрейдинг / бот (desktop-only)

- «Алерт до pt4»: опережение в % высоты X (pt3↔pt4), не % цены; только ручной режим.
- Сохранение `source: algo-bot` после cloud sync — алерты не пропадают из книги.
- Hotkeys рисования: `R` = тренд, `C` = канал (Терминал + Алго).

### График / индикаторы

- Смена монеты: SMA/EMA/Ribbon и viewport больше не уезжают в середину истории
  (invalidate preserve + clear overlays без restore).

### Скрипт / Терминал (desktop)

- Таймер авто-скана: merge `nextRunAt` при persist, schedule до `finished`.
- Статус Скрипта в шапке Терминала снова в `.header-status-cell`.

## Версии

- Web marker: `v0.85`
- Desktop app: `v1.0.82`
- Mac tag: `desktop-v1.0.82`
- Windows tag: `desktop-win-v1.0.82`
