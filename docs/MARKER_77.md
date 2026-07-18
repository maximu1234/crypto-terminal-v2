# Метка 77 — hardening после аудита и хоткей zoom на Скринере (июль 2026)

**Тег:** `metka-77`

## Что вошло

### Credentials / IPC

- `encryptionAvailable` отражает реальность: OS-шифрование на Win/Linux
  (`safeStorage`), на macOS — plaintext JSON с `mode 0o600` (без Keychain).
- Полный `apiKey` в IPC только с `revealApiKey: true` (форма настроек);
  иначе пусто, без `apiKeyHint` до reveal.

### Asset sync

- `sync-asset-versions.cjs` чинит relative-импорты (`../foo.js?v=`) так же,
  как `assets:check`.

### Scalping DOM / trade

- Тесты live-book, ladder, alerts/triggers/SL-TP, scale-label-providers.
- Widget open на Терминале → `openWidgetMarketPosition` в модулях Bybit/BingX
  (паритет auto-stops).
- Чекбокс стакана: подсказка «Стакан».

### Drawings / Screener

- RSI pane: `enableMagnet: false` и в placement (не только edit-drag).
- ПКМ-zoom на Скринере: **Shift+→** = кнопка ↗ (открыть в Терминале),
  только пока открыт большой график.

## Изоляция

- Isolation-тесты расширены: fat shared UI без exchange-policy, scalping-dom
  без импортов `trade/bybit|bingx`, credentials/reveal, widget open path.

## Версии

- Web marker: `v0.77`
- Desktop app: `v1.0.71`
- Mac tag: `desktop-v1.0.71`
- Windows tag: `desktop-win-v1.0.71`
