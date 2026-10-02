# Метка 183 — chrome motion (фаза 2)

**Тег:** `metka-183`  
**Откат инициативы:** `metka-181`

## Что вошло

- Плавное открытие/закрытие (`opacity`/`transform`, ~180ms):
  - окно **Настройки**;
  - dropdown шестерёнки (Терминал / Скринер);
  - **стакан** (scalping DOM) on/off;
  - панель **trade book** в coins list при mount.
- `js/chrome-motion.js` + `css/chrome-motion.css`
- `prefers-reduced-motion` → мгновенно
- Алерты / путь свечей не менялись

## Версии

- Web marker: `v0.183`
- Multichart desktop app: `v1.1.80` (без desktop-релиза на этой метке)
