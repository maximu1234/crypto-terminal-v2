import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getWorkerConfig } from "./config.js";
import {
  restGet,
  restHeadCount,
  restPatch,
  restDelete,
  restPatchReturning
} from "./supabase-rest.js";
import { normalizeAlertSymbol, normalizeExchangeId } from "./exchange-symbol.js";
import { normalizeWorkerTf } from "./tf-normalize.js";

let client = null;

/** @type {object|null} */
let cachedReloadFingerprint = null;

/** @type {Array<object>|null} */
let cachedTelegramAlerts = null;

function fingerprintKey(
fp
) {

  return JSON.stringify(fp);

}

function activeAlertsFilter(
withDeletedAt
) {

  const base =
    "triggered_at=is.null";

  return withDeletedAt
    ? `${base}&deleted_at=is.null`
    : base;

}

async function fetchMaxUpdatedAt(
table,
filter
) {

  try{
    const rows = await restGet(
      `${table}?select=updated_at&${filter}` +
      "&order=updated_at.desc&limit=1"
    );

    return rows?.[0]?.updated_at ?? null;
  }catch{
    return null;
  }

}

async function fetchActiveAlertsFingerprint(){

  try{
    const filter =
      activeAlertsFilter(
        true
      );

    const alertCount = await restHeadCount(
      `price_alerts?select=id&${filter}`
    );
    const alertMaxUpdatedAt =
      await fetchMaxUpdatedAt(
        "price_alerts",
        filter
      );

    return {
      alertCount,
      alertMaxUpdatedAt,
      softDelete: true
    };
  }catch{
    const filter =
      activeAlertsFilter(
        false
      );

    const alertCount = await restHeadCount(
      `price_alerts?select=id&${filter}`
    );
    const alertMaxUpdatedAt =
      await fetchMaxUpdatedAt(
        "price_alerts",
        filter
      );

    return {
      alertCount,
      alertMaxUpdatedAt,
      softDelete: false
    };
  }

}

async function fetchTelegramSettingsFingerprint(){

  try{
    const telegramUsersCount = await restHeadCount(
      "user_settings?select=user_id&telegram_chat_id=not.is.null"
    );
    const telegramEnabledCount = await restHeadCount(
      "user_settings?select=user_id&telegram_chat_id=not.is.null&alerts_cloud_disabled=eq.false"
    );
    const settingsMaxUpdatedAt =
      await fetchMaxUpdatedAt(
        "user_settings",
        "telegram_chat_id=not.is.null"
      );

    return {
      telegramUsersCount,
      telegramEnabledCount,
      settingsMaxUpdatedAt
    };
  }catch{
    const telegramUsersCount = await restHeadCount(
      "user_settings?select=user_id&telegram_chat_id=not.is.null"
    );
    const settingsMaxUpdatedAt =
      await fetchMaxUpdatedAt(
        "user_settings",
        "telegram_chat_id=not.is.null"
      );

    return {
      telegramUsersCount,
      telegramEnabledCount: telegramUsersCount,
      settingsMaxUpdatedAt
    };
  }

}

async function fetchReloadFingerprint(){

  const [
    alerts,
    settings
  ] = await Promise.all([
    fetchActiveAlertsFingerprint(),
    fetchTelegramSettingsFingerprint()
  ]);

  return {
    ...alerts,
    ...settings
  };

}

export function invalidateTelegramAlertsReloadCache(){

  cachedReloadFingerprint = null;
  cachedTelegramAlerts = null;

}

async function fetchTelegramAlertsFull(){

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    return [];
  }

  let alerts;
  let settings;
  let filter =
    activeAlertsFilter(
      true
    );

  try{
    alerts = await restGet(
      `price_alerts?select=id,user_id,symbol,shape_id,price,tf,exchange_id,created_at&${filter}`
    );
  }catch(err){
  if(
    String(
      err?.message || ""
    ).includes(
      "deleted_at"
    )
  ){
    filter =
      activeAlertsFilter(
        false
      );

    try{
      alerts = await restGet(
        `price_alerts?select=id,user_id,symbol,shape_id,price,tf,exchange_id,created_at&${filter}`
      );
    }catch(retryErr){
      console.warn(
        "fetch alerts (REST):",
        retryErr.message
      );
      return [];
    }
  }else{
    console.warn(
      "fetch alerts (REST):",
      err.message
    );
    return [];
  }
  }

  if (!alerts?.length) {
    return [];
  }

  const userIds = [...new Set(alerts.map(a => a.user_id))];
  const inList = userIds.join(",");

  try{
    settings = await restGet(
      `user_settings?select=user_id,telegram_chat_id,alerts_cloud_disabled&user_id=in.(${inList})&telegram_chat_id=not.is.null`
    );
  }catch(err){
    console.warn("fetch settings (REST):", err.message);
    return [];
  }

  const chatByUser = new Map(
    (settings || [])
      .filter(s => !s.alerts_cloud_disabled)
      .map(s => [s.user_id, Number(s.telegram_chat_id)])
  );

  const out = [];

  for (const row of alerts) {

    const exchangeId =
      normalizeExchangeId(
        row.exchange_id
      );

    const chatId = chatByUser.get(row.user_id);

    if (chatId == null) {
      continue;
    }

    out.push({
      id: row.id,
      user_id: row.user_id,
      symbol: normalizeAlertSymbol(row.symbol, exchangeId),
      shape_id: row.shape_id,
      price: Number(row.price),
      tf: normalizeWorkerTf(row.tf),
      exchange_id: exchangeId,
      created_at: row.created_at || null,
      telegram_chat_id: chatId
    });

  }

  return out;

}

export function getSupabaseAdmin() {

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    throw new Error(
      `Missing env: ${cfg.missing.join(", ")}`
    );
  }

  if (!client) {
    client = createClient(
      cfg.supabaseUrl,
      cfg.supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          WebSocket
        }
      }
    );
  }

  return client;

}

/**
 * Полная загрузка (без probe). Для /health и принудительного refresh.
 */
export async function fetchTelegramAlerts(
opts = {}
){

  if (
    opts.force ===
    true
  ) {
    invalidateTelegramAlertsReloadCache();
  }

  const result =
    await resolveTelegramAlertsReload(
      opts
    );

  return result.rows;

}

/**
 * Probe count/max(updated_at) → полный fetch только при изменении.
 * @returns {Promise<{ skipped: boolean, rows: Array<object> }>}
 */
export async function resolveTelegramAlertsReload(
opts = {}
){

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    cachedReloadFingerprint = null;
    cachedTelegramAlerts = [];
    return {
      skipped: false,
      rows: []
    };
  }

  if (
    opts.force ===
    true
  ) {
    invalidateTelegramAlertsReloadCache();
  }

  let fingerprint;

  try{
    fingerprint =
      await fetchReloadFingerprint();
  }catch(err){
    console.warn(
      "alerts reload probe:",
      err.message
    );
    fingerprint = null;
  }

  const fpKey =
    fingerprint
      ? fingerprintKey(
        fingerprint
      )
      : null;

  if (
    fpKey &&
    cachedReloadFingerprint &&
    fpKey ===
    fingerprintKey(
      cachedReloadFingerprint
    ) &&
    cachedTelegramAlerts
  ) {
    return {
      skipped: true,
      rows: cachedTelegramAlerts
    };
  }

  const rows =
    await fetchTelegramAlertsFull();

  if (fingerprint) {
    cachedReloadFingerprint =
      fingerprint;
  }

  cachedTelegramAlerts =
    rows;

  return {
    skipped: false,
    rows
  };

}

/** Для /health — почему alerts может быть 0 */
export async function fetchAlertDiagnostics() {

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    return {
      activeInDb: 0,
      withTelegramChat: 0,
      loadedForWorker: 0
    };
  }

  let alerts;
  let settings;

  try{
    alerts = await restGet(
      "price_alerts?select=user_id&triggered_at=is.null"
    );
  }catch(err){
    return {
      activeInDb: 0,
      withTelegramChat: 0,
      loadedForWorker: 0,
      alertsError: err.message
    };
  }

  const activeInDb = alerts?.length || 0;

  if (!activeInDb) {
    return {
      activeInDb: 0,
      withTelegramChat: 0,
      loadedForWorker: 0
    };
  }

  const userIds = [...new Set(alerts.map(a => a.user_id))];
  const inList = userIds.join(",");

  try{
    settings = await restGet(
      `user_settings?select=user_id,telegram_chat_id&user_id=in.(${inList})&telegram_chat_id=not.is.null`
    );
  }catch(err){
    return {
      activeInDb,
      withTelegramChat: 0,
      loadedForWorker: 0,
      settingsError: err.message
    };
  }

  const usersWithChat = new Set(
    (settings || []).map(s => s.user_id)
  );

  let withTelegramChat = 0;

  for (const row of alerts) {
    if (usersWithChat.has(row.user_id)) {
      withTelegramChat += 1;
    }
  }

  const loaded = await fetchTelegramAlerts({
    force: true
  });

  return {
    activeInDb,
    withTelegramChat,
    loadedForWorker: loaded.length
  };

}

/**
 * Забирает алерт (triggered_at), чтобы не сработало дважды (браузер + worker).
 * @returns {object|null} строка price_alerts
 */
export async function claimAlertById(alertId) {

  const cfg = getWorkerConfig();

  if (!cfg.ready || !alertId) {
    return null;
  }

  const triggeredAt =
    new Date().toISOString();

  try{
    const rows = await restPatchReturning(
      "price_alerts?id=eq." +
      encodeURIComponent(alertId) +
      "&triggered_at=is.null",
      { triggered_at: triggeredAt }
    );

    return rows?.[0] || null;
  }catch(err){
    console.warn(
      "claim alert:",
      err.message
    );
    return null;
  }

}

export async function fetchTelegramChatId(userId) {

  const cfg = getWorkerConfig();

  if (
    !cfg.ready ||
    !userId
  ) {
    return null;
  }

  try{
    const rows = await restGet(
      "user_settings?select=telegram_chat_id&user_id=eq." +
      encodeURIComponent(userId) +
      "&telegram_chat_id=not.is.null"
    );

    const id = rows?.[0]?.telegram_chat_id;

    return id != null ? Number(id) : null;
  }catch(err){
    console.warn(
      "fetch telegram chat:",
      err.message
    );
    return null;
  }

}

export async function markAlertTriggered(alertId) {

  const { executeAlertTrigger } =
    await import("./execute-trigger.js");

  const result =
    await executeAlertTrigger(alertId);

  return result.ok;

}
