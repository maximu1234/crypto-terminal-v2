# alerts-cloud/ — фаза 4 (wired)

Браузер грузит barrel `js/alerts-cloud-sync.js` → модули ниже.

| Модуль | Роль |
|--------|------|
| `debug.js` | ct_debug_alerts, pull backoff, lastSeenCloudAlerts |
| `worker-client.js` | очереди, REST purge/push, Railway /trigger /push-alert |
| `telegram-id.js` | user_settings.telegram_chat_id |
| `registry-sync.js` | reconcile, pull, push unsynced, flush |
| `polling-realtime.js` | Realtime channel, fast poll, initAlertsCloudSync |

Регресс: cross-device create/delete алертов; `npm run check:all`.
