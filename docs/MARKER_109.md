# Метка 109 — алерты backfill + Algo Bot cloud cut (июль 2026)

**Тег:** `metka-109`

## Что вошло

### Алерты (Multichart)

- Backfill истории из `price_alert_events` при открытии страницы «Алерты» (один SELECT, coalesce ≥60с).
- Unsynced local keep: 30с → 5 мин; push всех unsynced в реестре.
- Диагностика скрытых строк по бирже + лог drop unsynced при reconcile.

### Algo Bot UX / трафик

- Вход только кодом сессии (`mcauth1…`), без email OTP.
- Persistent зелёная надпись «Синхронизация с приложением успешна».
- Cut фонового Multichart cloud-sync в Algo Bot (`isAlgoBotLiteShell`): без hydrate/pull реестра, favorites poll, alerts realtime — остаются JWT, push/delete алертов, lock, remote.

### Версии

- Web marker: `v0.109`
- Multichart desktop app: `v1.1.8`
- Algo Bot desktop app: `v1.0.114`
- Mac tag (Multichart): `desktop-v1.1.8`
- Windows tag (Multichart): `desktop-win-v1.1.8`
- Mac tag (Algo Bot): `algo-bot-v1.0.114`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.114`
