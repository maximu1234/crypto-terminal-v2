# Анализ системы алертов + Telegram (май 2026)

Документ для возврата к работе: что ломалось, почему ходили по кругу, какой подход правильный, что уже сделано в коде.

---

## 1. Что вы хотели

| Требование | Смысл |
|------------|--------|
| Много алертов на графике | localStorage + линии на чарте |
| Перетаскивание линии | Цена в БД только при отпускании; во время drag не срабатывать |
| Telegram при закрытой вкладке | Фоновый worker по свечам |
| Supabase `price_alerts` | Облачный список активных алертов |
| Надёжно | Нет «сработало в браузере, строка осталась, Telegram нет» |

Проект: **ehygysphfsnluegeycjx** (crypto-terminal-dev), worker Railway, вход max.drukpa@gmail.com.

---

## 2. Хронология проблем (из чата)

1. **Только localStorage** → Telegram не было вообще.
2. **Добавили worker + Supabase** → двойные срабатывания (браузер + worker), гонки.
3. **`export` внутри функции** → весь `alerts-cloud-sync.js` не грузился.
4. **Очередь trigger** → второй алерт ждал первый.
5. **Worker 500 на push** → Node 20 + `createClient` без `ws`; REST fallback «успешен», worker падал.
6. **`ok: true` при `not_found`** → браузер не чистил Supabase.
7. **Merge облака затирал локальные алерты** → новые алерты пропадали из реестра.
8. **Ложный `cloudSynced`** → push не был в БД, но флаг «синхронизирован».
9. **Worker: `triggered_at` без delete** → зависшие строки, повторный trigger бесполезен.
10. **Перетаскивание** → ложные срабатывания «на лету».
11. **`sb.from().delete()` зависает** → после `cloud →` нет логов; purge/Telegram не идут.
12. **Дублирование `const body`** → SyntaxError, модуль мёртв.
13. **`getAuthed trigger timeout (8000ms)`** → первый алерт OK, второй: нет строки в БД, `no_auth`, purge не удался.

**Паттерн:** каждый раз чинили симптом (ещё один fallback, ещё retry), а корень — **слишком много путей** и **auth в горячем пути**.

---

## 3. Корневая причина (не «баг одной строки»)

### 3.1 Архитектурная перегрузка

Сейчас при одном событии участвуют **до 6 механизмов**:

- Browser cross (`alert-monitor.js`)
- Worker cross (`trigger-alert.js` + klines)
- Push: worker `/push-alert` → REST → supabase-js SDK (× retries)
- Trigger: browser purge REST + worker `/trigger` параллельно
- Realtime DELETE → `applyRemoteAlertFired`
- Reconcile / hydrate / `pushUnsynced` каждые 4 с и при `alerts-changed`

Они **конкурируют за один** `supabase.auth.getSession()` и за строку в `price_alerts`.

### 3.2 Auth — узкое горлышко

`waitForCloudAuth` опрашивает `getSession()` до **12 с**. При срабатывании алерта вызывается **снова**, хотя секунду назад push уже прошёл с тем же токеном.

Когда токен обновляется (`TOKEN_REFRESHED`), параллельные `getSession()` из push, reconcile и trigger **блокируют друг друга** → timeout → `purge: нет сессии`, `worker: no_auth`.

**Первый алерт после логина** — сессия свежая → OK.  
**Второй через минуту** — refresh + фоновый hydrate → trigger без кэша → fail.

### 3.3 Неправильное разделение ответственности

Браузер пытался:

- ловить пересечение,
- удалять строку (RLS),
- звать worker для Telegram,
- синхронизировать реестр.

Worker параллельно то же самое по свече. Итог: гонки и дубли, а при сбое auth — **ничего не доходит до БД/Telegram**.

---

## 4. Как делают «похожие» системы (обзор)

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| **Только worker** (TradingView-style фон) | Один источник истины, нет auth в браузере при trigger | UI без мгновенного toast без realtime |
| **DB trigger → очередь → cron/Edge** ([Supabase-Telegram](https://github.com/goktugcy/Supabase-Edge-Function-Telegram)) | Браузер не участвует в доставке | Задержка до 1 мин, сложнее SQL |
| **Webhook ingress + worker pool** ([DEV: crypto bots](https://dev.to/mintscripts/why-most-telegram-crypto-bots-fail-under-load-and-how-to-fix-it-2193)) | Ingress быстрый, тяжёлое — в фоне | Нужна очередь (Redis и т.д.) |
| **Браузер UI + один POST на trigger** | Просто | Trigger должен быть **идемпотентным** на сервере |

**Вывод:** для вашего стека (Supabase + Railway + открытая вкладка) оптимально:

1. **Запись алерта** — один канал: `POST /push-alert` (service role).
2. **Срабатывание** — **worker владеет** DELETE + Telegram; браузер только UI (линия, звук) и опционально **один** `POST /trigger` с `alert_id` + `price` (без своего DELETE).
3. **Кэш JWT** в памяти после логина — не звать `getSession()` на каждый trigger.

---

## 5. Рекомендуемая целевая архитектура

```
[Создание алерта]
  Chart → localStorage (UI)
       → POST /push-alert (JWT) → price_alerts (worker, service role)
       → mark cloudId + cloudSynced только после id в ответе

[Срабатывание — вкладка открыта]
  Browser cross → UI (disarm, toast, sound)
               → POST /trigger { alert_id, symbol, price, tf }  // только Telegram+delete на сервере
               → НЕ вызывать sb.delete() в браузере

[Срабатывание — вкладка закрыта]
  Worker kline cross → executeAlertTrigger → DELETE + Telegram

[Синхронизация UI]
  Realtime DELETE на price_alerts → убрать линию (applyRemoteAlertFired)
```

**Идемпотентность:** `executeAlertTrigger` = DELETE BY id RETURNING; если 0 rows → `notifyTelegramOnly` по телу запроса (уже есть в worker).

**Интервал worker:** `ALERTS_RELOAD_MS=1000` на Railway — быстрее подхват нового алерта.

---

## 6. Что изменено в коде (сессия «на ночь»)

| Изменение | Файл | Зачем |
|-----------|------|--------|
| `alert-auth-cache.js` | новый | JWT + ctx после логина / TOKEN_REFRESHED |
| `warmAlertAuthCache` в `applySession` | `cloud-sync.js` | Кэш при входе |
| `getAuthed` / `getWorkerRequestAuth` читают кэш | `alerts-cloud-sync.js` | Нет 8 с timeout на trigger |
| `fireAlertCloudTrigger` — кэш первым | там же | purge + worker с известным token |
| `pushAlertViaRest` — кэш token, timeout getSession | там же | Не зависать на push |
| Purge через REST + parallel worker | там же | Обход зависания SDK delete |
| `notifyTelegramOnly` если строка уже удалена | `execute-trigger.js`, `client-trigger.js` | Telegram без строки в БД |
| `verifyUserToken` через fetch | `client-http.js` | Node 20 без ws |
| Threading dev server | `scripts/dev-server.py` | ERR_CONNECTION_RESET |

**Версия кэша:** `?v=51` после деплоя (сейчас в репо может быть v=50 — при коммите поднять).

---

## 7. Чеклист для вас утром

1. **GitHub Desktop** → commit → push (сайт + **alert-worker**).
2. Терминал (одна строка):
   ```bash
   cd /Users/maxdrukpa/crypto-terminal-v2 && ./start.sh
   ```
3. **Cmd+Shift+R** на coins.html.
4. Войти через шестерёнку (обновит кэш auth).
5. Удалить старые строки в Supabase Table Editor.
6. **Алерт 1:** создать → в таблице появилась строка → дождаться срабатывания → Telegram + строка исчезла.
7. **Алерт 2** (главный тест): сразу второй → строка в таблице → срабатывание → снова Telegram + delete.

**Ожидаемые логи при trigger:**

```
[alerts] сработал: …
[alerts] cloud → … <uuid>
[alerts] удаляем строку + Telegram…
[alerts] purge REST ok: …
[alerts] ✓ Supabase удалено (браузер): …
[alerts] worker: … true true
```

Если снова `getAuthed trigger timeout` — пришлите скрин; тогда следующий шаг: **убрать browser purge полностью**, только `/trigger`.

---

## 8. Что НЕ делать снова (антипаттерны)

- Добавлять 4-й fallback push (SDK + REST + worker + …) без удаления старых.
- Вызывать `getAuthed()` в цикле retry на каждой попытке.
- Считать `cloudSynced=true` без `cloudId` или без SELECT в БД.
- Параллельно browser DELETE и worker DELETE без идемпотентного Telegram fallback.
- Чинить только «симптом в консоли» без проверки **второго алерта подряд**.

---

## 9. Дальнейшие шаги (если v51 всё ещё капризничает)

**Вариант A (минимальный):** убрать `purgeAlertViaRest` из браузера; только `POST /trigger` с кэшированным JWT.

**Вариант B (средний):** браузер **не** ловит cross при включённом worker URL — только worker + realtime для UI.

**Вариант C (максимальный):** Supabase Edge Function + `telegram_outbox` таблица; trigger в БД при DELETE/UPDATE — Telegram вообще вне Railway.

---

## 10. Баг «4 алерта на графике, 2 в таблице» (утро)

**Причина:** гонка при быстром создании нескольких алертов.

1. Каждый алерт делал `loadAlerts()` → `push` → `saveAlerts()` **параллельно**.
2. Два последних `saveAlerts` перезаписывали реестр — в `localStorage` оставалось **2 записи**.
3. В консоли было `✓ Supabase` для всех, потому что **push шёл с правильным объектом в памяти**, но `sync` / `pushUnsynced` потом видели только 2 алерта в реестре.
4. Worker помечал `cloudSynced: true` **без проверки**, что строка реально в БД.

**Исправление (v=52):** очередь записи в реестр, очередь push, `mergeRegistryFromChartDrawings()` перед sync, `cloudSynced` только после verify в БД.

---

## 11. Краткий ответ «почему ходили по кругу»

Мы лечили **следствия** (timeout, 500, SyntaxError, RLS), не **модель**: слишком много агентов трогают одну строку и один auth-клиент. Пока trigger зависит от «достать сессию заново в момент пика», второй и третий алерты будут нестабильны. **Кэш JWT + один server-side trigger + один push path** — это стабилизация; полный порядок — вариант A/B выше.

Доброй ночи. После деплоя начните с теста **двух алертов подряд** — это главный индикатор, что проблема решена.
