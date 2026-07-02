import { getWorkerConfig } from "./config.js";

function restBase() {

  const cfg = getWorkerConfig();
  const base = cfg.supabaseUrl.replace(/\/$/, "");

  return {
    base,
    key: cfg.supabaseServiceRoleKey
  };

}

/**
 * HEAD + Prefer: count=exact — только Content-Range, без тела ответа.
 */
export async function restHeadCount(
  pathAndQuery
) {

  const { base, key } = restBase();

  const res = await fetch(
    `${base}/rest/v1/${pathAndQuery}`,
    {
      method: "HEAD",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact"
      }
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `REST HEAD ${res.status}: ${text.slice(0, 200)}`
    );
  }

  const range =
    res.headers.get("content-range") || "";
  const m =
    range.match(/\/(\d+)$/);

  return m
    ? parseInt(m[1], 10)
    : 0;

}

export async function restGet(pathAndQuery) {

  const { base, key } = restBase();

  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json"
    }
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `REST ${res.status}: ${text.slice(0, 200)}`
    );
  }

  if (!text) {
    return [];
  }

  return JSON.parse(text);

}

export async function restPatch(pathAndQuery, body) {

  const { base, key } = restBase();

  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `REST PATCH ${res.status}: ${text.slice(0, 200)}`
    );
  }

  return true;

}

export async function restPatchReturning(
  pathAndQuery,
  body
) {

  const { base, key } = restBase();

  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `REST PATCH ${res.status}: ${text.slice(0, 200)}`
    );
  }

  if (!text) {
    return [];
  }

  return JSON.parse(text);

}

export async function restUpsertUserDrawing(row) {

  const { base, key } = restBase();

  const res = await fetch(
    `${base}/rest/v1/user_drawings?on_conflict=user_id,symbol,shape_id`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(row)
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `REST UPSERT user_drawings ${res.status}: ${text.slice(0, 200)}`
    );
  }

  if (!text) {
    return null;
  }

  const parsed = JSON.parse(text);

  return Array.isArray(parsed)
    ? parsed[0]
    : parsed;

}

export async function restUpsertPriceAlert(row) {

  const { base, key } = restBase();

  const res = await fetch(
    `${base}/rest/v1/price_alerts?on_conflict=user_id,symbol,shape_id`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(row)
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `REST UPSERT ${res.status}: ${text.slice(0, 200)}`
    );
  }

  if (!text) {
    return null;
  }

  const parsed = JSON.parse(text);

  return Array.isArray(parsed)
    ? parsed[0]
    : parsed;

}

export async function restInsertAlertEvent(row) {

  const { base, key } = restBase();

  const res = await fetch(
    `${base}/rest/v1/price_alert_events`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(row)
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `REST INSERT price_alert_events ${res.status}: ${text.slice(0, 200)}`
    );
  }

  if (!text) {
    return null;
  }

  const parsed = JSON.parse(text);

  return Array.isArray(parsed)
    ? parsed[0]
    : parsed;

}

export async function restDelete(pathAndQuery) {

  const { base, key } = restBase();

  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    method: "DELETE",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `REST DELETE ${res.status}: ${text.slice(0, 200)}`
    );
  }

  return true;

}

/** DELETE с возвратом удалённых строк (для атомарного claim). */
export async function restDeleteReturning(
  pathAndQuery
) {

  const { base, key } = restBase();

  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    method: "DELETE",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation"
    }
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `REST DELETE ${res.status}: ${text.slice(0, 200)}`
    );
  }

  if (!text) {
    return [];
  }

  const parsed = JSON.parse(text);

  return Array.isArray(parsed)
    ? parsed
    : [parsed];

}

/** DELETE с Prefer: count=exact (число в Content-Range). */
export async function restDeleteCount(
  pathAndQuery
) {

  const { base, key } = restBase();

  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    method: "DELETE",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal,count=exact"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `REST DELETE ${res.status}: ${text.slice(0, 200)}`
    );
  }

  const range =
    res.headers.get("content-range") || "";
  const m =
    range.match(/\/(\d+)$/);

  return m
    ? parseInt(m[1], 10)
    : 0;

}

/** PATCH с Prefer: count=exact (число в Content-Range). */
export async function restPatchCount(
  pathAndQuery,
  body
) {

  const { base, key } = restBase();

  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,count=exact"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `REST PATCH ${res.status}: ${text.slice(0, 200)}`
    );
  }

  const range =
    res.headers.get("content-range") || "";
  const m =
    range.match(/\/(\d+)$/);

  return m
    ? parseInt(m[1], 10)
    : 0;

}
