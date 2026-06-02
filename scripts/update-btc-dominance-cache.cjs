#!/usr/bin/env node
/**
 * Обновляет data/btc-dominance-cache.json (offline fallback для /api/coingecko).
 * Запуск: node scripts/update-btc-dominance-cache.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data/btc-dominance-cache.json");
const CMC = "https://pro-api.coinmarketcap.com/trial-pro-api";
const CG = "https://api.coingecko.com/api/v3";

const TOP = [
  "bitcoin", "ethereum", "tether", "binancecoin", "solana", "ripple"
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.status?.error_message || body?.error || `HTTP ${res.status}`);
  }
  return body;
}

async function tryCmc(days = 90) {
  const url = `${CMC}/v1/global-metrics/quotes/historical?interval=daily&count=${days}`;
  for (let i = 0; i < 4; i++) {
    try {
      const body = await fetchJson(url);
      const points = (body?.data?.quotes || [])
        .map((q) => {
          const t = q?.timestamp ? Math.floor(new Date(q.timestamp).getTime() / 1000) : null;
          const v = Number(q?.btc_dominance ?? q?.quote?.USD?.btc_dominance);
          if (!t || !Number.isFinite(v)) return null;
          return { time: t, value: Math.round(v * 100) / 100 };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);
      if (points.length) {
        return { method: "cmc_trial_historical", days: String(days), points, current: points.at(-1).value };
      }
    } catch (e) {
      console.warn("CMC attempt", i + 1, e.message);
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

function nearest(sorted, t) {
  if (!sorted.length) return null;
  let lo = 0, hi = sorted.length - 1;
  if (t <= sorted[0][0]) return sorted[0][1];
  if (t >= sorted[hi][0]) return sorted[hi][1];
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const mt = sorted[mid][0];
    if (mt === t) return sorted[mid][1];
    if (mt < t) lo = mid + 1; else hi = mid - 1;
  }
  const c = [];
  if (lo < sorted.length) c.push(sorted[lo]);
  if (lo > 0) c.push(sorted[lo - 1]);
  let best = null, diff = Infinity;
  for (const [tt, cap] of c) {
    const d = Math.abs(tt - t);
    if (d < diff) { diff = d; best = cap; }
  }
  return diff <= 3 * 3600 * 1000 ? best : null;
}

async function tryCoingecko(days = 90) {
  const charts = [];
  for (const id of TOP) {
    try {
      const chart = await fetchJson(`${CG}/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
      charts.push({ id, caps: chart.market_caps || [] });
      console.log("  ok", id, chart.market_caps?.length || 0);
    } catch (e) {
      console.warn("  skip", id, e.message);
      charts.push({ id, caps: [] });
    }
    await sleep(3500);
  }
  const btc = charts.find((c) => c.id === "bitcoin");
  if (!btc?.caps?.length) throw new Error("no btc chart");
  const sorted = charts
    .filter((c) => c.caps.length)
    .map((c) => ({ caps: [...c.caps].sort((a, b) => a[0] - b[0]) }));
  const btcSorted = [...btc.caps].sort((a, b) => a[0] - b[0]);

  let domNow = null;
  const global = await fetchJson(`${CG}/global`).catch(() => null);
  domNow = Number(global?.data?.market_cap_percentage?.btc);
  if (!Number.isFinite(domNow)) {
    try {
      const cmc = await fetchJson(`${CMC}/v1/global-metrics/quotes/latest`);
      domNow = Number(cmc?.data?.btc_dominance);
    } catch {
      domNow = null;
    }
  }

  const lastT = btc.caps[btc.caps.length - 1][0];
  let sumNow = 0;
  for (const c of sorted) {
    const cap = nearest(c.caps, lastT);
    if (cap) sumNow += cap;
  }
  const btcNow = nearest(btcSorted, lastT) || btc.caps[btc.caps.length - 1][1];
  const totalNow =
    Number(global?.data?.total_market_cap?.usd) ||
    (domNow > 0 && btcNow > 0 ? btcNow / (domNow / 100) : 0);
  const scale = totalNow > 0 && sumNow > 0 ? totalNow / sumNow : 1;
  const byTime = new Map();
  for (const [tMs, btcCap] of btc.caps) {
    let sum = 0;
    for (const c of sorted) {
      const cap = nearest(c.caps, tMs);
      if (cap) sum += cap;
    }
    const total = sum * scale;
    if (total > 0 && btcCap > 0) {
      const pct = (btcCap / total) * 100;
      if (pct > 0 && pct <= 100) {
        byTime.set(Math.floor(tMs / 1000), Math.round(pct * 100) / 100);
      }
    }
  }
  const points = [...byTime.entries()].map(([time, value]) => ({ time, value })).sort((a, b) => a.time - b.time);
  const current = Number.isFinite(domNow)
    ? Math.round(domNow * 100) / 100
    : points.at(-1)?.value ?? null;
  return {
    method: "coingecko_top6_estimate",
    days: String(days),
    points,
    current: Number.isFinite(current) ? Math.round(current * 100) / 100 : points.at(-1)?.value ?? null
  };
}

async function main() {
  console.log("BTC dominance cache update…");
  let payload = await tryCmc(90);
  if (!payload) {
    console.log("CMC failed — CoinGecko (slow, ~30s)…");
    payload = await tryCoingecko(90);
  }
  const out = {
    ok: true,
    ...payload,
    pointCount: payload.points.length,
    updatedAt: Date.now(),
    cached: true
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log("Wrote", OUT, "points:", out.pointCount, "method:", out.method);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
