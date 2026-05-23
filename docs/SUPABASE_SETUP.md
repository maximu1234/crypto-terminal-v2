# Supabase sync (ветка `feature/supabase-sync`)

Пока только **избранное** (флаги на монетах). `main` без этой ветки работает как раньше.

## 1. SQL в Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → проект **ehygysphfsnluegeycjx**
2. **SQL Editor** → New query
3. Вставь содержимое файла `supabase/schema.sql` → **Run**

## 2. Вход по email

1. **Authentication** → **Providers** → **Email** — включён
2. **Authentication** → **URL Configuration**:
   - **Site URL:** твой preview на Vercel, например `https://crypto-terminal-v2-xxx.vercel.app`
   - **Redirect URLs** (добавь все):
     - `http://127.0.0.1:8080/**`
     - `http://localhost:8080/**`
     - `https://*.vercel.app/**` (или точный preview URL)

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

## 5. Проверка

1. Войди на iPad (preview URL)
2. Поставь флаг на монете
3. На Mac открой тот же preview, войди тем же email
4. Избранное должно совпасть

Без входа сайт работает как раньше (только localStorage).
