# Перенос синхронизации на production (main)

Тест прошёл на ветке `feature/supabase-sync` и preview Vercel. Ниже — перенос на основной сайт (`main` → Production).

## 1. GitHub — слить в `main`

**GitHub Desktop** (или веб):

1. Убедись, что все коммиты запушены с `feature/supabase-sync`.
2. **Branch** → **main** → **Merge into current branch** → выбери `feature/supabase-sync`.
3. Разреши конфликты, если появятся (обычно их нет).
4. **Push origin** для `main`.

Vercel сам задеплоит Production после пуша в `main`.

## 2. Vercel — переменные для Production

**Project** → **Settings** → **Environment Variables**:

| Name | Value | Environments |
|------|--------|----------------|
| `SUPABASE_URL` | `https://ehygysphfsnluegeycjx.supabase.co` | **Production** (+ Preview, если нужен) |
| `SUPABASE_ANON_KEY` | anon key из Supabase → Settings → API | **Production** (+ Preview) |

Раньше ключи были только на Preview — для основного сайта нужен **Production**.

После сохранения: **Deployments** → последний production → **Redeploy** (если деплой был до добавления переменных).

## 3. Supabase — URL основного сайта

**Authentication** → **URL Configuration**:

1. **Site URL** — production-адрес Vercel, например:
   - `https://crypto-terminal-v2.vercel.app`
   - или твой кастомный домен (без `/` в конце).
2. **Redirect URLs** — оставь и добавь при необходимости:
   - `https://crypto-terminal-v2.vercel.app/**`
   - `https://*.vercel.app/**`
   - `http://127.0.0.1:8080/**`
   - `http://localhost:8080/**`
3. **Save**

Preview-URL можно оставить в Redirect URLs — на вход это не мешает.

## 4. Supabase — SQL

Если на проекте уже выполнялись блоки 1–3 из `supabase/schema.sql` (флаги + рисунки + RLS + Realtime) — **ничего повторять не нужно**.

База одна и та же для preview и production.

## 5. Проверка на production

1. Открой **production URL** (не preview).
2. **Cmd+Shift+R** на Mac, на iPad — обнови вкладку.
3. Главная → шестерёнка → войди тем же email, что на тесте.
4. Флаг и линия на одной монете: Mac ↔ iPad.

Без входа сайт работает как раньше (только localStorage).

## 6. Локально на Mac (по желанию)

```bash
git checkout main
git pull
cp js/supabase-env.example.js js/supabase-env.js   # если ещё нет
./start.sh
```

Заполни `js/supabase-env.js` (файл в `.gitignore`, в репозиторий не попадает).
