# alerts-cloud/ — подготовка к фазе 4

**Не подключено к прод.** Браузер грузит монолит `js/alerts-cloud-sync.js`.

Модули здесь — черновик split; перед wiring:

1. Починить дубли и зависимости (`worker-client.js`, `telegram-id.js`).
2. Прогнать `npm run check:all` и cross-device регресс алертов.
3. Заменить монолит на barrel (как `drawings-cloud-sync.js`).

См. [REFACTOR_DRAWINGS.md](../../docs/REFACTOR_DRAWINGS.md) — фаза 4.
