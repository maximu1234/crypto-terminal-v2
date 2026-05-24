function readEnv(name) {

  const raw = process.env[name];

  if (
    raw == null ||
    typeof raw !== "string"
  ) {
    return "";
  }

  const v = raw.trim();

  if (
    v === "" ||
    v === "undefined" ||
    v === "null"
  ) {
    return "";
  }

  return v;

}

export function getWorkerConfig() {

  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const telegramBotToken = readEnv("TELEGRAM_BOT_TOKEN");

  const missing = [];

  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  if (!supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!telegramBotToken) {
    missing.push("TELEGRAM_BOT_TOKEN");
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    telegramBotToken,
    missing,
    ready: missing.length === 0
  };

}

/** Для /health — без секретов */
export function getConfigStatus() {

  const cfg = getWorkerConfig();

  return {
    ready: cfg.ready,
    missing: cfg.missing,
    supabaseUrlSet: !!cfg.supabaseUrl,
    telegramSet: !!cfg.telegramBotToken
  };

}
