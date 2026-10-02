# bot-app site-bundle — frozen (intentional)

Standalone Algo Bot (`bot-app/`) keeps a **frozen** `site-bundle`.
`bot-app/scripts/bundle-site.cjs` does **not** pull live Multichart `js/`.

Expect marker/ lag vs Multichart web (e.g. web `v0.193` while bot may stay on an older drawings path without `drawings-kv.js`).

When promoting Multichart chart/drawings/algo UI into Algo Bot, sync **manually** and bump bot release — do not treat drift as an accidental CI failure of Multichart `bundle:sync`.
