# Метка 2 — алерты (текущий эталон)

**Зафиксировано:** 2026-05-25  
**Тег:** `metka-2` · **Коммит:** `111fdfe` (`111fdfe7e915ff19ed69feb5a36048521a893926`).

## Что работает

- **1m на 1m** — звук (`sounds/cute_msg_alert.mp3`), тост, линия снимается, Telegram.
- **Несколько алертов** — подряд и одновременно.
- **Cross-TF** — алерт на 1m при графике 1h (и наоборот): фоновый WS `syncBackgroundAlertStreams`, браузер + Telegram.
- **Облако** — JWT из `ct_supabase_auth`, push/trigger через worker, reconcile без ложного «сработал».
- **Telegram** — 3 строки, тикер фьючей `UBUSDT.P`, цена `0.0000` (4 знака).

## Ключевые файлы

| Область | Файлы |
|--------|--------|
| UI / реестр | `js/alerts.js`, `js/drawings.js`, `js/alert-monitor.js` |
| Облако | `js/alerts-cloud-sync.js`, `js/alert-auth-cache.js` |
| Терминал | `js/terminal.js`, `js/site-boot.js` |
| Worker | `alert-worker/lib/telegram.js`, `execute-trigger.js`, … |
| Звук | `sounds/cute_msg_alert.mp3` |
| SQL | `supabase/migration-price-alerts-realtime.sql` (realtime DELETE) |

## Откат к метке 2

```bash
git checkout metka-2 -- js/ alert-worker/lib/ sounds/ docs/
# или: git checkout 111fdfe -- js/ …
```

Вся ветка: `git checkout metka-2` (сохраните незакоммиченное отдельно).

## Метка 1 (старая)

До cross-TF и доработок TF — [`MARKER_1.md`](MARKER_1.md), коммит `cd152b6` / база `a8d79cf`.

## Дальше

Сбор статистики сбоев; при возврате к теме — консоль `[alerts]`, `worker:`, TF графика vs алерта.
