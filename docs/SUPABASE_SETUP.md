# Supabase — синхронизация избранного и рисунков

**Избранное** (флаги), **рисунки** и **алерты в Telegram** (опционально) между устройствами после входа по email.

Подробный перенос с тестовой ветки на production: [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md).

## 1. SQL в Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → проект **ehygysphfsnluegeycjx**
2. **SQL Editor** → New query
3. Запускай по **блокам** из `supabase/schema.sql` (см. комментарии в файле)
4. Закрой **Table Editor** для `user_settings` перед Run, если был deadlock

Проверка: в `user_settings` есть колонки `drawings`, `drawings_updated_at`.

**Алерты + Telegram:** после блоков 1–3 выполни `supabase/migration-alerts-telegram.sql`. Worker: папка `alert-worker/`, деплой на Railway — см. `alert-worker/README.md`.

**Рисунки (как алерты, по строкам):** выполни `supabase/migration-user-drawings.sql`, затем `supabase/migration-user-drawings-realtime.sql`. При первом входе старый JSON из `user_settings.drawings` импортируется в таблицу `user_drawings` автоматически.

## 2. Вход по email

1. **Authentication** → **Providers** → **Email** — включён
2. **Confirm email** — выключить (удобнее magic link)
3. **URL Configuration**:
   - **Site URL** — **production**-URL сайта (не `127.0.0.1`), например `https://crypto-terminal-v2.vercel.app`
   - **Redirect URLs** — production, preview, localhost (см. `PRODUCTION_DEPLOY.md`)

### Имя отправителя «Multichart» (не «Supabase Auth»)

Стандартная почта Supabase (`noreply@mail.app.supabase.io`) **не позволяет** сменить имя в шапке — только через **свой SMTP**.

В почте станет: **Multichart** `<noreply@ваш-домен.com>` вместо **Supabase Auth**.

Опционально: **Authentication** → **Email Templates** — тема и текст magic link (HTML); поле «From» берётся из SMTP.

---

### Подробно: что такое «подключить провайдера»

**Провайдер** — сервис, который реально отправляет письма (Resend, Brevo, SendGrid…). Supabase только говорит ему: «отправь magic link этому пользователю».

Нужно три вещи:

| Что | Зачем |
|-----|--------|
| **Аккаунт у провайдера** | SMTP-логин и пароль (часто пароль = API key) |
| **Домен** (желательно свой) | Чтобы письма не попадали в спам; `noreply@multichart.ru`, а не чужой домен |
| **DNS-записи** SPF/DKIM | Провайдер даст записи — добавить у регистратора домена (или Cloudflare) |

Без своего домена можно **только тестировать** (у Resend — `onboarding@resend.dev`, письма только на ваш email). Для пользователей в проде — **верифицированный домен**.

После настройки в Supabase: **Authentication** → **Rate Limits** — лимит email поднять (по умолчанию после SMTP ~30/час, потом увеличить под нагрузку).

---

### Вариант A — Resend (рекомендуем для старта)

Простой UI, есть [гайд Supabase + Resend](https://resend.com/docs/send-with-supabase-smtp). Бесплатный тариф на малый объём.

**Шаг 1 — аккаунт**

1. [resend.com](https://resend.com) → Sign up
2. **API Keys** → Create API Key → скопировать (`re_…`) — это **Password** в Supabase

**Шаг 2 — домен (production)**

1. **Domains** → Add Domain → ваш домен (например `multichart.app` или тот, с которого открывается сайт)
2. Resend покажет DNS-записи (TXT, MX, иногда CNAME) — добавить в панели домена
3. Дождаться статуса **Verified** (от нескольких минут до 48 ч)

**Шаг 3 — Supabase SMTP**

[SMTP Settings](https://supabase.com/dashboard/project/ehygysphfsnluegeycjx/auth/smtp):

| Поле Supabase | Значение |
|---------------|----------|
| Enable Custom SMTP | вкл |
| Sender name | `Multichart` |
| Sender email | `noreply@ваш-домен.com` (домен из Resend) |
| Host | `smtp.resend.com` |
| Port | `465` (SSL) или `587` (STARTTLS) |
| Username | `resend` |
| Password | API key `re_…` |

**Save** → **Authentication** → **Rate Limits** → увеличить `Email sent` при необходимости.

**Шаг 4 — проверка**

Шестерёнка на сайте → ввести свой email → письмо должно прийти от **Multichart**, ссылка ведёт на ваш Site URL.

**Быстрый тест без домена (только себе):**

- В Resend можно слать с `onboarding@resend.dev` только на email владельца аккаунта Resend — для проверки UI, не для пользователей.

**Интеграция в один клик:** [Resend → Integrations → Supabase](https://resend.com/settings/integrations) — подставит SMTP в проект (всё равно нужен домен для продакшена).

---

### Вариант B — Brevo (бывший Sendinblue)

Бесплатный план, SMTP из коробки, подходит если уже есть аккаунт.

1. [brevo.com](https://www.brevo.com) → регистрация
2. **Transactional** → **Senders** → добавить отправителя (домен верифицировать)
3. **SMTP & API** → SMTP — скопировать server, login, password
4. В Supabase те же поля: Sender name `Multichart`, Sender email с верифицированного домена, Host/Port/User/Pass из Brevo

---

### Вариант C — SendGrid / Postmark / Amazon SES

Тот же принцип: создать аккаунт → верифицировать домен → раздел **SMTP credentials** → перенести в Supabase.

| Сервис | Кому удобно |
|--------|-------------|
| **Postmark** | Только транзакционные письма, высокая доставляемость |
| **SendGrid** | Крупные объёмы, чуть сложнее настройка |
| **Amazon SES** | Уже в AWS, дёшево при масштабе |

---

### Частые ошибки

- **Sender email не с того домена** — в Supabase указан `noreply@a.com`, а в провайдере верифицирован только `b.com` → письма не уходят или отклоняются.
- **Не сохранили SMTP** / опечатка в API key — в логах Supabase **Authentication** → **Logs**.
- **Site URL / Redirect URLs** — magic link ведёт не на ваш сайт (см. §2 выше); к отправителю не относится.
- **Лимит 30 писем/час** сразу после SMTP — поднять в Rate Limits.
- Письма в **спаме** — не настроены SPF/DKIM; тема письма слишком «маркетинговая» (лучше: `Вход в Multichart`).

---

### Что не нужно менять в коде репозитория

`signInWithOtp` в `js/cloud-sync.js` уже вызывает Supabase Auth — после SMTP в дашборде все клиенты (localhost, Vercel) получат нового отправителя автоматически.

## 3. Локально на Mac

```bash
cp js/supabase-env.example.js js/supabase-env.js
```

Вставь **Project URL** и **anon key** (Supabase → Settings → API).

```bash
./start.sh
```

На главной: шестерёнка → **Синхронизация** → email → **Войти**.

## 4. Vercel

**Settings** → **Environment Variables**:

| Name | Value | Environments |
|------|--------|----------------|
| `SUPABASE_URL` | `https://ehygysphfsnluegeycjx.supabase.co` | **Production** и Preview |
| `SUPABASE_ANON_KEY` | anon key | **Production** и Preview |

Build (`vercel.json`) создаёт `js/supabase-env.js` при деплое.

## 5. Realtime

Таблица `user_settings` в publication `supabase_realtime` (блок 3 в `schema.sql`).

**iPad / Safari:** в фоне WebSocket спит; на открытой вкладке — опрос ~10 с + при возврате в Safari.

## 6. Проверка

1. Войди на Mac и iPad **одним email**
2. Флаги и рисунки меняются на одном устройстве → появляются на другом (1–10 с)

Без входа — только localStorage, как раньше.
