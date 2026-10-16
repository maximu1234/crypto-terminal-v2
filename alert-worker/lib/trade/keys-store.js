import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { readEnv } from "../config.js";

/** SHA-256 hex prefix of gate email — empty = legacy single-tenant path. */
let activeOwnerKey = "";

function keysDir() {
  const fromEnv = readEnv("TRADE_KEYS_DIR");
  if (fromEnv) {
    return fromEnv;
  }
  const volume = readEnv("RAILWAY_VOLUME_MOUNT_PATH");
  if (volume) {
    return volume;
  }
  return "/data/trade";
}

function keyBytes() {
  const raw = readEnv("TRADE_KEYS_KEY");
  if (!raw) {
    return null;
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function tradeKeysDir() {
  return keysDir();
}

export function tradeKeysReady() {
  return !!keyBytes();
}

export function volumeLooksMounted() {
  const dir = keysDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Bind disk key file to site-gate email (trade token).
 * Empty email → legacy `bybit.enc` (single-tenant).
 */
export function setTradeKeysOwner(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) {
    activeOwnerKey = "";
    return;
  }
  activeOwnerKey = crypto
    .createHash("sha256")
    .update(e)
    .digest("hex")
    .slice(0, 16);
}

export function getTradeKeysOwnerKey() {
  return activeOwnerKey;
}

function exchangeFileId(exchangeId) {
  return exchangeId === "bybit" ? "bybit" : "bybit";
}

function ownerFilePath(exchangeId) {
  const id = exchangeFileId(exchangeId);
  if (activeOwnerKey) {
    return path.join(keysDir(), `${id}-${activeOwnerKey}.enc`);
  }
  return path.join(keysDir(), `${id}.enc`);
}

function legacyFilePath(exchangeId) {
  return path.join(keysDir(), `${exchangeFileId(exchangeId)}.enc`);
}

function decryptFile(file) {
  const key = keyBytes();
  if (!key) {
    return null;
  }
  let raw;
  try {
    raw = fs.readFileSync(file);
  } catch {
    return null;
  }
  if (raw.length < 17) {
    return null;
  }
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]).toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed?.apiKey || !parsed?.apiSecret) {
      return null;
    }
    return {
      apiKey: String(parsed.apiKey),
      apiSecret: String(parsed.apiSecret),
      testnet: !!parsed.testnet
    };
  } catch {
    return null;
  }
}

export function loadTradeKeys(exchangeId = "bybit") {
  const owned = decryptFile(ownerFilePath(exchangeId));
  if (owned) {
    return owned;
  }
  /* Migrate legacy single-file blob into per-email path once. */
  if (activeOwnerKey) {
    const legacy = decryptFile(legacyFilePath(exchangeId));
    if (legacy) {
      try {
        saveTradeKeys(exchangeId, legacy);
      } catch {
        /* keep serving legacy in-memory */
      }
      return legacy;
    }
  }
  return null;
}

export function saveTradeKeys(exchangeId, creds) {
  const key = keyBytes();
  if (!key) {
    throw new Error("TRADE_KEYS_KEY missing");
  }
  const dir = keysDir();
  fs.mkdirSync(dir, { recursive: true });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.from(
    JSON.stringify({
      apiKey: String(creds.apiKey || "").trim(),
      apiSecret: String(creds.apiSecret || "").trim(),
      testnet: !!creds.testnet
    }),
    "utf8"
  );
  const enc = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  fs.writeFileSync(ownerFilePath(exchangeId), Buffer.concat([iv, tag, enc]));
}

export function clearTradeKeys(exchangeId = "bybit") {
  try {
    fs.unlinkSync(ownerFilePath(exchangeId));
  } catch {
    /* missing is fine */
  }
  if (activeOwnerKey) {
    try {
      fs.unlinkSync(legacyFilePath(exchangeId));
    } catch {
      /* ignore */
    }
  }
}

export function keysStatus(exchangeId = "bybit") {
  const creds = loadTradeKeys(exchangeId);
  const key = creds?.apiKey || "";
  return {
    exchangeId: "bybit",
    configured: !!(creds?.apiKey && creds?.apiSecret),
    testnet: !!creds?.testnet,
    encryptionAvailable: tradeKeysReady(),
    apiKey: "",
    apiKeyHint: key ? `••••${key.slice(-4)}` : "",
    hasSecret: !!creds?.apiSecret
  };
}
