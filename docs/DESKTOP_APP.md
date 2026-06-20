# Multichart Desktop (macOS)

Нативная оболочка **Multichart.app** для macOS: тот же интерфейс, что на [crypto-terminal-v2.vercel.app](https://crypto-terminal-v2.vercel.app), но в отдельном окне. Данные, Supabase, Railway worker — как в браузере. Следующий этап — локальный модуль торговли Bybit с ключами только на компе.

## Для пользователя

1. Скачайте **Multichart-x.y.z.dmg** из [GitHub Releases](https://github.com/maximu1234/crypto-terminal-v2/releases) (тег `desktop-v*).
2. Перетащите **Multichart** в «Программы».
3. При первом запуске без подписи Apple: ПКМ → «Открыть» (один раз).
4. Обновления: кнопка **«Обновить»** в шапке сайта (или меню Multichart → «Проверить обновления…»). После загрузки — **«Перезапустить»**.

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

## Новый релиз desktop (maintainer)

1. Обновите `"version"` в `desktop/package.json`.
2. Закоммитьте и запушьте тег:
   ```bash
   git tag desktop-v1.0.1
   git push origin desktop-v1.0.1
   ```
3. Workflow **Desktop release (macOS)** соберёт `.dmg`, `.zip` и `latest-mac.yml` и опубликует в GitHub Releases.

После деплоя UI на Vercel пользователи увидят кнопку «Обновить» в установленной .app.

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
