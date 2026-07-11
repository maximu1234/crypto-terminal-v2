# Метка 65 — алерты в Telegram при закрытом приложении, Share PnL в Дневнике (июль 2026)

**Тег:** `metka-65`

## Что вошло

- **Алерты (worker):** после REST upsert/delete клиент вызывает `POST /reload-hint`; push/delete на воркере — force reload; `pagehide` сбрасывает несинхронизированные алерты при выходе. Исправляет доставку в Telegram, когда desktop полностью закрыт (metka-56 оставлял воркер без обновления до 30 мин).
- **Дневник:** Share PnL в колонке PnL $ (та же модалка, что в Позициях); шаблоны 1323×960; `generate-bybit-pnl-diary-card.py`; ROI/цены из закрытой сделки.
- **Railway:** redeploy `alert-worker` обязателен для `/reload-hint`.

## Версии

- Web marker: `v0.65`
- Desktop app: `v1.0.58` (Mac `.dmg` → `desktop-v1.0.58`, Win `.exe` → `desktop-win-v1.0.58`)
