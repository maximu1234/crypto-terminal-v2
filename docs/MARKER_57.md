# Метка 57 — Checkpoint before phone-mobile removal (июль 2026)

**Тег:** `metka-57` · **Алиас:** `pre-remove-mobile` · **Коммит:** `71c3e8e`

**Предыдущий эталон:** [MARKER_56.md](./MARKER_56.md) (`metka-56`).

## Зачем

Фиксированная точка отката **до** полного удаления phone-мобильной оболочки (бар, hamburger, drawer, terminal-mobile). Приложение в этом коммите работает: desktop + iPad/tablet.

## Откат

```bash
git checkout metka-57
# или
git checkout pre-remove-mobile
```

После отката: `npm run bundle:sync` при необходимости.

## Что следует после этой метки

Удаление phone UI (`max-width: 640px` chrome): `terminal-mobile.js`, `site-mobile-nav.js`, `mobile-nav-drawer.js`, `mobile-recovery.js`, `site-mobile-nav.css` и связанные HTML/CSS/вызовы. **iPad/tablet сохраняется.**
