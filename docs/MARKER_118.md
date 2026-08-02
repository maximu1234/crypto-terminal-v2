# Метка 118 — Паттерн ГиП, Algo cloud-lite, Bot IPC (август 2026)

**Тег:** `metka-118`

## Что вошло

### Паттерн ГиП (Терминал / индикаторы)

- Новый overlay «Паттерн ГиП» (Голова и Плечи / Inverse H&S на RSI Swing).
- Порт Pine: `js/indicators/pattern-gip-{math,paint,js}`; оригинал Pattern 1-2 не трогали.
- Настройки как у других индикаторов; палитра цветов TV (`openIndicatorColorPicker`).
- Шильды t0/t0′ со стороны шеи (шорт снизу / лонг сверху).
- Правило подхода: между t0 и t1 шорт не закалывает t1 сверху; лонг — снизу.

### Egress / cloud на странице Алго

- `isAlgoReducedCloudClient()` = Algo Bot lite ∨ `/algo-trading.html`.
- Без hydrate/poll/favorites / Auth keepalive / chart→`price_alerts`.
- JWT + push + cloud lock + remote Status — остаются.

### Algo Bot standalone

- Terminal `trading.*` IPC и stream **выключены**; preload — stub.
- Только `algoTrading.*` + `algo-exchange-credentials`.
- `pendingMirrorTriggers` пишутся на диск (вместе с triggers/entries).
- `site-bundle` по-прежнему заморожен; checklist в `bundle-site.cjs`.

### Документация

- `docs/MARKER_117.md` — версии hotfix 1.1.16/17 и Bot 1.0.125.
- `docs/TRADING_MODULE.md` — cloud-lite, Bot IPC, pending mirror, coupling debt.

## Версии

- Web marker: `v0.118`
- Multichart desktop app: `v1.1.18`
- Mac tag (Multichart): `desktop-v1.1.18`
- Windows tag (Multichart): `desktop-win-v1.1.18`
- Algo Bot desktop app: `v1.0.126`
- Mac tag (Algo Bot): `algo-bot-v1.0.126`
- Windows tag (Algo Bot): `algo-bot-win-v1.0.126`
