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
  const legacyKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = readEnv("SUPABASE_SECRET_KEY");

  /* sb_secret_ — новый admin-ключ; если оба заданы, не берём legacy anon по ошибке */
  const supabaseServiceRoleKey =
    secretKey.startsWith("sb_secret_")
      ? secretKey
      : legacyKey.startsWith("sb_secret_")
        ? legacyKey
        : secretKey || legacyKey;
  const telegramBotToken = readEnv("TELEGRAM_BOT_TOKEN");

  const missing = [];

  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  if (!supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
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

  const key = cfg.supabaseServiceRoleKey || "";
  let serviceKeyKind = "missing";
  let jwtRole = "";

  if (key.startsWith("eyJ")) {
    serviceKeyKind = "legacy_jwt";
    try {
      const payload = key.split(".")[1];
      const json = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
      );
      jwtRole = json.role || "";
    } catch {
      jwtRole = "decode_failed";
    }
  } else if (key.startsWith("sb_secret_")) {
    serviceKeyKind = "sb_secret";
  } else if (
    key.startsWith("sb_publishable_") ||
    key.startsWith("sb_publishable")
  ) {
    serviceKeyKind = "sb_publishable";
  } else if (key) {
    serviceKeyKind = "other";
  }

  let supabaseProjectRef = "";

  try {
    supabaseProjectRef =
      new URL(cfg.supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    supabaseProjectRef = "";
  }

  return {
    ready: cfg.ready,
    missing: cfg.missing,
    supabaseUrlSet: !!cfg.supabaseUrl,
    telegramSet: !!cfg.telegramBotToken,
    serviceKeyKind,
    jwtRole,
    supabaseProjectRef
  };

}
