# bot-app site-bundle — lite sync (intentional)

Standalone Algo Bot (`bot-app/`) is a **lite** shell: no Terminal chart UI.
It does **not** show Multichart graphs on the remote/server bot.

Sync path (plugin + JS dependency graph + algo engines):

```bash
node scripts/sync-bot-lite-from-multichart.cjs
# or: npm run bundle:site --prefix bot-app
```

Source of truth:
- `js/algo-trading/**`, `js/algo-trading.js`, related CSS/HTML panels
- `desktop/trading/algo-*.cjs` → `bot-app/trading/`

Frozen in bot-app (not overwritten by Multichart chrome):
- lite nav / Electron shell (`main` / preload / platform)
- bot-session-logs-viewer stub
- no Terminal trading IPC (stubs only)

JS under `site-bundle/js` that the algo boot graph no longer imports is deleted
on sync. `scripts/check-bot-lite-bundle.cjs` fails if such a file is committed.

After sync: bump `bot-app/package.json` and cut `algo-bot-v*` / `algo-bot-win-v*` releases.
Do not treat Multichart `bundle:sync` drift as a CI failure for the bot.
