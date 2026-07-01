# Метка 46 — торговля, PnL share, BANDWIDTH-CUT, SMA/EMA (июль 2026)

**Тег:** `metka-46` · **Веб:** `v0.46` · **Desktop:** `desktop-v1.0.38` → `v1.0.38`

**Предыдущий эталон:** [MARKER_45.md](./MARKER_45.md) (`metka-45` / `desktop-v1.0.37`).

## Релиз

| Компонент | Описание |
|-----------|----------|
| Торговля (desktop) | Панель позиций/ордеров, close-all, PnL share, звуки открытия/закрытия |
| Настройки | Окно «Настройки» (Telegram, Bybit desktop, секретные Supabase prefs) |
| BANDWIDTH-CUT | Realtime/облако рисунков/авто-флаги отключены в коде; алерты — авто; флаги — кнопка «Обновить» |
| Индикаторы | SMA/EMA: чекбоксы линий, fix viewport при смене монеты и включении |
| Терминал | Multi-layout, сброс price scale при смене символа после ручного зума |

## BANDWIDTH-CUT (Supabase Free)

Жёсткий блок `BANDWIDTH_CUT` в `supabase-usage-prefs.js`. В секретных настройках пункты 1–5 серые (напоминание), активен только переключатель алертов.

Восстановление: закомментировать `BANDWIDTH_CUT` и блоки `/* BANDWIDTH-CUT */` в `site-boot.js`, `cloud-sync.js`.

## Desktop DMG

```bash
git tag desktop-v1.0.38   # на коммит metka-46
git push origin desktop-v1.0.38   # GitHub Actions → .dmg
```

## Ключевые версии

| Файл | v |
|------|---|
| `terminal.js` | 361 |
| `trade-book-panel.js` | 42 |
| `cloud-sync.js` | 40 |
| `moving-average.js` | 14 |
| `release-marker.js` | METKA 46 / desktop 1.0.38 |
