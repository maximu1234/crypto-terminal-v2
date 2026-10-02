# Метка 194 — audit fixes (IDB harden + security hygiene)

**Тег:** `metka-194`  
**Откат chrome/chart:** `metka-181`

## Что вошло

- **Drawings KV:** immediate hydrate; reload on `drawings-kv-ready`; IDB write fail → LS fallback + un-purge; visibilitychange IDB refresh; clear-all awaits hydrate.
- **Alert CORS:** allowlist (same as trade origins), not reflect-any.
- **tradeToken TTL:** 12h → 2h.
- **mcauth1:** envelope with `iat`, reject after 15 minutes.
- **Logout:** clear `ct_telegram_chat_v1:*` caches.
- **Docs:** SUPABASE drawings = local IDB; bot-app SITE_BUNDLE.md (frozen intentional).
- **Hygiene:** root `node_modules/` gitignore; remove MACD mutate scripts; BingX overlay comments.
- **CHROME:** `chromeOverlayRedrawReason()` wired from settings open.

## Не меняли (by design / out of scope)

- Logout keeps local drawings (DRAWINGS_REGRESSION).
- macOS plaintext credentials (Keychain UX).
- Shared Railway Bybit keys (single-tenant gate).
- Fat diary UI split; bot-app full Multichart resync (frozen).

## Версии

- Web: `v0.194`
- Desktop app: `v1.1.80` (без desktop-релиза)
