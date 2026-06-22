# Multichart Desktop (macOS)

Нативная оболочка **Multichart.app** для macOS: тот же код, что на [crypto-terminal-v2.vercel.app](https://crypto-terminal-v2.vercel.app), но **UI загружается с диска** (быстрые графики). Supabase, Bybit, Railway — через интернет.

## Для пользователя

1. Скачайте **Multichart-x.y.z.dmg** из [GitHub Releases](https://github.com/maximu1234/crypto-terminal-v2/releases) (тег `desktop-v*`). Лучше **.dmg**, не .zip.
2. Перетащите **Multichart** в «Программы».
3. **Первый запуск без подписи Apple** — macOS может написать *«повреждено и не может быть открыто»*. Приложение не сломано, это Gatekeeper.

   **Способ A (быстрее всего):** Терминал:
   ```bash
   xattr -cr /Applications/Multichart.app
   ```
   Затем запуск из «Программы».

   Если всё равно *«повреждено»* — скачайте **1.0.2+** (arm64 .dmg для Apple Silicon): в 1.0.0 была битая подпись CI.

   **Способ B:** ПКМ по **Multichart.app** → **Открыть** → **Открыть** (один раз).

   **Способ C:** Настройки → **Конфиденциальность и безопасность** → «Все равно открыть».

4. Обновления: кнопка **«Обновить»** — скачивание → установка → перезапуск. Если зависло на «Устанавливаем…» — **Cmd+Q**, затем снова откройте Multichart (обновление доставится при выходе). Полный авто-перезапуск надёжнее с Apple Developer подписью.

5. **Вход по email:** ссылка из письма открывает приложение (desktop **1.0.6+**). Если откроется браузер — скопируйте адрес страницы и вставьте в поле «Войти по ссылке» в настройках. В Supabase → Redirect URLs должно быть `multichart://auth/callback`.

Сборку `.dmg` на своём Mac делать **не нужно** — CI собирает релиз при теге `desktop-v1.0.1` и т.д.

## Архитектура

```
Multichart.app (Electron)
  └─ http://127.0.0.1 — HTML/JS/CSS из site-bundle (локальный HTTP в main process)
  └─ /api/* → прокси на Vercel (Bybit fallback, Twelve Data, CoinGecko)
  └─ Bybit REST/WS — напрямую с api.bybit.com
  └─ Supabase / Railway worker — интернет
  └─ preload → window.cryptoTerminalDesktop
  └─ electron-updater → GitHub Releases
```

| Компонент | Сайт (Vercel) | Desktop (.app) |
|-----------|---------------|----------------|
| UI, графики, рисунки (js/css) | деплой | **site-bundle внутри .app** |
| `/api/*` | serverless | **→ Vercel** (прокси в Electron) |
| Bybit свечи / WS | браузер | **напрямую** |
| Supabase, алерты | интернет | интернет |
| **Торговля** (`/trade`), Bybit API keys | ❌ | ✅ |

При каждом desktop-релизе CI копирует актуальную статику из репо (`npm run bundle:site`). На Vercel `/trade` редиректится на `/coins`; пункт «Торговля» в меню — только в `.app`.

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
- `SYSTEM_ADMIN_EMAIL` (опционально)

Без них соберётся stub — синхронизация в .app не заработает.

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

## Подпись Apple (рекомендуется для автообновления)

Без notarization macOS может блокировать обновления. Для production добавьте secrets в GitHub:

| Secret | Назначение |
|--------|------------|
| `APPLE_ID` | Apple ID разработчика |
| `APPLE_APP_SPECIFIC_PASSWORD` | app-specific password |
| `APPLE_TEAM_ID` | Team ID |
| `CSC_LINK` | base64 `.p12` сертификата |
| `CSC_KEY_PASSWORD` | пароль p12 |

И в workflow перед `build:mac:publish`:

```yaml
env:
  CSC_LINK: ${{ secrets.CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

## Дальше: торговля

См. [TRADING_MODULE.md](./TRADING_MODULE.md) — фаза 1 (Keychain + IPC) в `desktop/trading/`.
