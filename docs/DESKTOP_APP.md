# Multichart Desktop (macOS)

Нативная оболочка **Multichart.app** для macOS: тот же код, что на [crypto-terminal-v2.vercel.app](https://crypto-terminal-v2.vercel.app), но **UI загружается с диска** (быстрые графики). Supabase, Bybit, Railway — через интернет.

## Для пользователя

1. Скачайте **Multichart-x.y.zf.dmg** / **…zm.dmg** из [GitHub Releases](https://github.com/maximu1234/crypto-terminal-v2/releases) (тег `desktop-v*`). Буква: **f** = full (live+manual), **m** = friends (manual-only). Лучше **.dmg**, не .zip.
2. Перетащите **Multichart** в «Программы».
3. **Первый запуск без подписи Apple** — macOS может написать *«повреждено и не может быть открыто»* или просто заблокировать запуск. Приложение не сломано, это Gatekeeper.

   **Способ A (быстрее всего):** Терминал:
   ```bash
   xattr -cr /Applications/Multichart.app
   ```
   Затем запуск из «Программы».

   Если всё равно *«повреждено»* — скачайте свежий arm64 .dmg для Apple Silicon: в старых сборках могла быть битая подпись CI.

   **Способ B (macOS Sequoia 15+):** двойной клик по приложению → в диалоге **Done / Готово** → **Системные настройки → Конфиденциальность и безопасность** → внизу «…заблокировано» → **Все равно открыть** (Open Anyway).  
   На Sequoia **больше нет** пункта «Открыть» по ПКМ — Apple убрала этот обход Gatekeeper.

   **Способ C (macOS Sonoma и старше):** ПКМ по **Multichart.app** → **Открыть** → **Открыть** (один раз), либо тот же путь через Настройки → Конфиденциальность и безопасность.
4. Обновления: **вручную** — скачайте новый `.dmg` / `.exe` из GitHub Releases. In-app auto-updater (`electron-updater`) **не подключён**; файл `latest-mac.yml` в релизе — заготовка, не канал обновлений.

5. **Вход по email:** ссылка из письма открывает приложение. Если откроется браузер — скопируйте адрес страницы и вставьте в поле «Войти по ссылке» в настройках. В Supabase → Redirect URLs должно быть `multichart://auth/callback`.

Сборку `.dmg` на своём Mac делать **не нужно** — CI собирает релиз при теге `desktop-v1.0.1` и т.д.

## Архитектура

```
Multichart.app (Electron)
  └─ http://127.0.0.1 — HTML/JS/CSS из site-bundle (локальный HTTP в main process)
  └─ /api/* → прокси на Vercel (Bybit fallback, Twelve Data, CoinGecko)
  └─ Bybit REST/WS — напрямую с api.bybit.com
  └─ Supabase / Railway worker — интернет
  └─ preload → window.cryptoTerminalDesktop
  └─ обновления — вручную из GitHub Releases (не electron-updater)
```

| Компонент | Сайт (Vercel) | Desktop (.app) |
|-----------|---------------|----------------|
| UI, графики, рисунки (js/css) | деплой | **site-bundle внутри .app** |
| `/api/*` | serverless | **→ Vercel** (прокси в Electron) |
| Bybit свечи / WS | браузер | **напрямую** |
| Supabase, алерты | интернет | интернет |
| Торговля Bybit | Railway `/trade/*` | IPC `trading.*` |
| Торговля BingX | ❌ | ✅ IPC |
| Live-бот Алго | ❌ | ✅ |

При каждом desktop-релизе CI копирует актуальную статику из репо (`npm run bundle:site`). Тег `desktop-vX.Y.Z` должен совпадать с `desktop/package.json` и `DESKTOP_APP_VERSION` в `js/release-marker.js` (CI падает при mismatch). Без `SUPABASE_*` secrets релизный build **падает** (`REQUIRE_SUPABASE_ENV=1`).

**WIP vs .app:** незакоммиченные правки не попадают в GitHub Release. Локальный `npm start` в `desktop/` пересобирает site-bundle из текущего дерева (включая dirty WIP).

**Credentials at rest:** на macOS ключи биржи — plaintext JSON в userData (mode `0600`, без Keychain prompts); на Windows — OS encrypt (`safeStorage`), когда доступен. Ожидается FileVault / disk encryption на Mac.

## Разработка

```bash
cd desktop
npm install
npm start              # bundle + local HTTP (как в .app)
npm run start:dev      # UI с http://127.0.0.1:8080 (./start.sh в корне)
npm run start:remote   # старый режим — UI с Vercel
```

`npm run bundle:site` — вручную пересобрать `site-bundle/` из корня репо.

`DESKTOP_REMOTE_UI=1` — загрузка UI с Vercel вместо bundle (отладка).

## CI / секреты GitHub

Для bundle с облаком в **Desktop release** добавьте Secrets (те же, что на Vercel):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALERT_WORKER_URL`
- `SYSTEM_ADMIN_EMAIL` (allowlist для `/system`; попадает в клиентский `supabase-env.js` на билде — не коммитить локальный файл)

Без `SUPABASE_URL` / `SUPABASE_ANON_KEY` **desktop/algo-bot release workflows падают**.

## Производительность (только .app)

- **Локальный UI** — без загрузки js/css с CDN
- Отключён throttling рендерера / фоновых таймеров (macOS App Nap)
- `powerSaveBlocker` — приложение не засыпает при работе
- Старт на **Монеты** (`/terminal.html`)
- Preconnect к Bybit и Supabase
- UA как у Chrome (без `Electron/` в строке)

## Первый релиз через GitHub Desktop

Код desktop уже в `main`. **Releases появится только после push тега** `desktop-v1.0.0` (не от обычного коммита).

1. **Fetch** в GitHub Desktop — подтянуть последний коммит с тегом (если ещё не на машине).
2. **Push origin** — отправить коммит(ы), если GitHub Desktop показывает «N commits to push».
3. **Опубликовать тег:** меню **Repository → Push tags…** (или галочка «Push tags» при push) — должен уйти **`desktop-v1.0.0`**.
4. На GitHub: **Actions** → **Desktop release (macOS)** (~10–20 мин).
5. **Releases** → скачать **Multichart-1.0.0.dmg**.

Следующие версии: поднять `"version"` в `desktop/package.json`, коммит, новый тег `desktop-v1.0.1` → push + push tags.

## Новый релиз desktop (maintainer, терминал)

1. Обновите `"version"` в `desktop/package.json`.
2. Тег и push:
   ```bash
   git tag -a desktop-v1.0.1 -m "Multichart desktop 1.0.1"
   git push origin desktop-v1.0.1
   ```
3. Workflow **Desktop release (macOS)** соберёт `.dmg`, `.zip` и `latest-mac.yml`.

## Подпись Apple (Gatekeeper / notarization)

In-app auto-updater **не подключён** — обновления вручную из GitHub Releases.
Подпись и notarization нужны, чтобы macOS не блокировала **первый запуск** и чтобы `.dmg`/`.app` не помечались как повреждённые. Secrets для CI:

| Secret | Назначение |
|--------|------------|
| `APPLE_ID` | Apple ID разработчика |
| `APPLE_APP_SPECIFIC_PASSWORD` | app-specific password |
| `APPLE_TEAM_ID` | Team ID |
| `CSC_LINK` | base64 `.p12` сертификата |
| `CSC_KEY_PASSWORD` | пароль p12 |

## Дальше: торговля

См. [TRADING_MODULE.md](./TRADING_MODULE.md) — credentials + IPC в `desktop/trading/`.
