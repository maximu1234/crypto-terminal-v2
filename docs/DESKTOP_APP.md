# Multichart Desktop (macOS)

Нативная оболочка **Multichart.app** для macOS: тот же интерфейс, что на [crypto-terminal-v2.vercel.app](https://crypto-terminal-v2.vercel.app), но в отдельном окне. Данные, Supabase, Railway worker — как в браузере. Следующий этап — локальный модуль торговли Bybit с ключами только на компе.

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

4. Обновления: кнопка **«Обновить»** в шапке — одно нажатие: проверка → загрузка → установка → перезапуск. Или Multichart → «Проверить обновления…». Не закрывайте приложение вручную во время «Устанавливаем и перезапускаем…».

5. **Вход по email:** ссылка из письма открывает приложение (desktop **1.0.6+**). Если откроется браузер — скопируйте адрес страницы и вставьте в поле «Войти по ссылке» в настройках. В Supabase → Redirect URLs должно быть `multichart://auth/callback`.

Сборку `.dmg` на своём Mac делать **не нужно** — CI собирает релиз при теге `desktop-v1.0.1` и т.д.

## Архитектура

```
Multichart.app (Electron)
  └─ BrowserWindow → https://crypto-terminal-v2.vercel.app
       └─ preload → window.cryptoTerminalDesktop (обновления, позже — локальные ключи)
  └─ electron-updater → GitHub Releases (latest-mac.yml + .zip)
```

| Компонент | Где |
|-----------|-----|
| UI, графики, рисунки | Vercel (как сейчас) |
| `/api/*` прокси | Vercel serverless |
| Алерты / Telegram | Railway worker |
| Оболочка + автообновление | `desktop/` |
| Кнопка «Обновить» | `js/desktop-app-ui.js` (на сайте, видна только в .app) |

## Разработка

```bash
cd desktop
npm install
npm start              # production URL
npm run start:dev      # http://127.0.0.1:8080 (./start.sh в корне)
```

Переменная `CRYPTO_TERMINAL_URL` — любой origin для окна.

`DESKTOP_SKIP_WARM_CACHE=1` — отключить прогрев js/css при старте (отладка).

## Производительность (только .app)

- Отключён throttling рендерера / фоновых таймеров (macOS App Nap)
- `powerSaveBlocker` — приложение не засыпает при работе
- Кэш диска до ~512 MB, V8 code cache
- **Warm-cache:** перед окном подтягивает chart/coins js/css по `asset-manifest.js` с сервера (phase1), остальное — в фоне; старт на `/coins.html`
- По умолчанию открывается **Монеты** (`/coins.html`), не Главная — меньше лишних переходов
- Preconnect к Vercel и **api.bybit.com** (история свечей)
- UA как у Chrome (без `Electron/` в строке)
- Проверка обновлений — через 12 с после загрузки страницы (не мешает старту)

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

## Дальше: Bybit локально

План (не в этом PR):

- `ipcMain` + safeStorage / Keychain для API key/secret
- Отдельный модуль `desktop/trading/` — запросы на Bybit **из main process**, не через публичный сайт
- UI ордеров в Electron-only panel или `cryptoTerminalDesktop` bridge

Текущая .app уже использует partition `persist:multichart-desktop` — сессия и cookies изолированы от Safari/Chrome.
