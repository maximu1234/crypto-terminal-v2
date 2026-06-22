/**
 * Скопируй в supabase-env.js (файл в .gitignore) и вставь значения из
 * Supabase → Project Settings → API.
 *
 * На Vercel (Preview): Environment Variables
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 * и buildCommand сгенерирует supabase-env.js автоматически.
 */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
/**
 * URL Railway alert-worker — только origin, с https://, без /alerts в конце.
 * Пример: https://crypto-terminal-v2-production.up.railway.app
 */
export const ALERT_WORKER_URL = "";
/** Опционально: @username бота, если /telegram/info с worker недоступен (ссылка на странице Алерты) */
export const TELEGRAM_BOT_USERNAME = "";
/** Email админа для скрытой страницы /system (можно несколько через запятую в SYSTEM_ADMIN_EMAIL) */
export const SYSTEM_ADMIN_EMAIL = "";
/** Email владельца дневника сделок (desktop .app). Если пусто — используется SYSTEM_ADMIN_EMAIL */
export const TRADE_DIARY_OWNER_EMAIL = "";
