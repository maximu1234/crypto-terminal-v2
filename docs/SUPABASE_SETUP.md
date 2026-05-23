# Supabase sync (ветка `feature/supabase-sync`)

Пока только **избранное** (флаги на монетах). `main` без этой ветки работает как раньше.

## 1. SQL в Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → проект **ehygysphfsnluegeycjx**
2. **SQL Editor** → New query
3. Вставь содержимое файла `supabase/schema.sql` → **Run**

## 2. Вход по email

1. **Authentication** → **Providers** → **Email** — включён
2. **Authentication** → **Sign In / Providers** → выключи **Confirm email** (иначе первое письмо ведёт на Site URL).

3. **Authentication** → **URL Configuration** (важно для iPad):
   - **Site URL** — **НЕ** `127.0.0.1`. Поставь preview с Vercel, например:
     `https://crypto-terminal-v2-git-feature-supabase-sync-maxscreener.vercel.app`
     (без слэша в конце)
   - **Redirect URLs** — добавь **все** строки:
     - `http://127.0.0.1:8080/**`
     - `http://localhost:8080/**`
     - `https://crypto-terminal-v2-git-feature-supabase-sync-maxscreener.vercel.app/**`
     - `https://*.vercel.app/**`
   - **Save**

Если Site URL = localhost, письма с iPad всё равно откроют 127.0.0.1.

## 3. Локально на Mac

```bash
cp js/supabase-env.example.js js/supabase-env.js
```

Открой `js/supabase-env.js` и вставь **Project URL** и **anon key** из Supabase → Settings → API.

Запуск:

```bash
./start.sh
```

В шапке появится поле email → **Войти** → ссылка на почту.

## 4. Vercel (только Preview, не Production)

**Settings** → **Environment Variables**:

| Name | Value | Environments |
|------|--------|----------------|
| `SUPABASE_URL` | `https://ehygysphfsnluegeycjx.supabase.co` | Preview |
| `SUPABASE_ANON_KEY` | anon key | Preview |

**Production** не отмечай, пока не готов merge в `main`.

При деплое ветки `feature/supabase-sync` build создаст `js/supabase-env.js` автоматически.

## 5. Realtime (флаги без перезагрузки)

В **SQL Editor** один раз:

```sql
alter publication supabase_realtime add table public.user_settings;
```

Либо: **Database** → **Publications** → `supabase_realtime` → включить таблицу `user_settings`.

Без этого шага синхронизация работает при смене вкладки / фокусе, но не мгновенно.

**iPad / Safari:** в фоне iOS отключает WebSocket — мгновенный realtime не идёт. Пока вкладка **на экране**, флаги подтягиваются каждые ~10 с; при возврате в Safari — сразу после переключения вкладки.

## 6. Проверка

1. Войди на iPad (preview URL) и на Mac тем же email
2. Поставь или сними флаг на одном устройстве
3. На втором флаг должен обновиться за 1–2 секунды без refresh

Без входа сайт работает как раньше (только localStorage).
