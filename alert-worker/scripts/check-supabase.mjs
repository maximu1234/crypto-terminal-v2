#!/usr/bin/env node
/**
 * Локальная проверка: видит ли service_role те же алерты, что SQL (2 и 2).
 * cd alert-worker && cp .env.example .env  # заполни URL + SERVICE_ROLE
 * node scripts/check-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Заполни SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env");
  process.exit(1);
}

const kind = key.startsWith("eyJ")
  ? "legacy_jwt (OK)"
  : key.startsWith("sb_secret_")
    ? "sb_secret (может не работать — возьми Legacy service_role)"
    : key.startsWith("sb_publishable")
      ? "publishable (НЕПРАВИЛЬНО)"
      : "unknown";

console.log("key kind:", kind);
console.log("project:", new URL(url).hostname.split(".")[0]);

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data: alerts, error: e1 } = await sb
  .from("price_alerts")
  .select("id, user_id")
  .is("triggered_at", null);

if (e1) {
  console.error("price_alerts ERROR:", e1.message, e1.code);
  process.exit(1);
}

console.log("active alerts:", alerts?.length ?? 0);

if (!alerts?.length) {
  process.exit(0);
}

const userIds = [...new Set(alerts.map(a => a.user_id))];

const { data: settings, error: e2 } = await sb
  .from("user_settings")
  .select("user_id, telegram_chat_id")
  .in("user_id", userIds)
  .not("telegram_chat_id", "is", null);

if (e2) {
  console.error("user_settings ERROR:", e2.message, e2.code);
  process.exit(1);
}

console.log("users with chat id:", settings?.length ?? 0);
console.log("OK — worker должен видеть столько же, сколько alerts_for_telegram в SQL");
