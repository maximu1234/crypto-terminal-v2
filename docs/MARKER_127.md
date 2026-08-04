# Метка 127 — Auth wipe fix + LAN watchlists UI (август 2026)

**Тег:** `metka-127`

## Что вошло

- **Auth:** не стирать `refresh_token` на любой HTTP 400/401; fatal только по
  invalid_grant; soft-block fake 401 и гонка ротации refresh не логинят наружу.
  Красная «Auth refresh сломан» / вылет из аккаунта на Multichart и Algo Bot.
- **LAN «Отдать списки»:** после `POST /watchlists` бот пушит флаги в UI
  (`applyTickerFlags`); Multichart пушит root из localStorage (не устаревший main).
- **LAN / cloud lock / session:** reclaim lock своим Algo Bot; heal «Отдать
  сессию» / restore при drift file↔UI.
- **UX:** активная монета всегда в видимой зоне списка (Terminal / Algo).

## Версии

- Web marker: `v0.127`
- Multichart desktop app: `v1.1.27`
- Algo Bot desktop app: `v1.0.136`
- Mac tag (Multichart): `desktop-v1.1.27`
- Windows tag (Multichart): `desktop-win-v1.1.27`
- Mac tag (Algo Bot): `algo-bot-v1.0.136`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.136`
