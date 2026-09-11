import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { readEnv } from "../config.js";

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

function filePath(exchangeId) {
  const id = exchangeId === "bybit" ? "bybit" : "bybit";
  return path.join(keysDir(), `${id}.enc`);
}

export function loadTradeKeys(exchangeId = "bybit") {
  const key = keyBytes();
  if (!key) {
    return null;
  }
  let raw;
  try {
    raw = fs.readFileSync(filePath(exchangeId));
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
  fs.writeFileSync(filePath(exchangeId), Buffer.concat([iv, tag, enc]));
}

export function clearTradeKeys(exchangeId = "bybit") {
  try {
    fs.unlinkSync(filePath(exchangeId));
  } catch {
    /* missing is fine */
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
