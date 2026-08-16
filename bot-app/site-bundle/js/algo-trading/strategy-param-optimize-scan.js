/**
 * Подбор параметров стратегии по всем тикерам биржи (universe = all).
 */
import {
loadMarketHistory
} from "../market-api.js?v=5";

import {
readAlgoPattern12Settings
} from "./pattern-12-settings.js?v=3";

import {
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=14";

import {
normalizeAlgoScanTf,
ALGO_TICKER_SCAN_HISTORY_REQUESTS,
ALGO_TICKER_SCAN_DELAY_MS
} from "./ticker-scanner.js?v=9";

import {
resolveAlgoScanUniverseItems
} from "./scan-universe.js?v=2";

import {
optimizeAlgoStrategyParams,
normalizeAlgoOptimizeStrategyId,
formatAlgoOptimizeParamsBrief,
comboToApplyPatch
} from "./strategy-param-optimize.js?v=7";

/** Тяжёлый CPU-перебор — держим низкую параллельность. */
export const ALGO_OPTIMIZE_UNIVERSE_CONCURRENCY = 1;

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @param {{
 *   strategyId?: string,
 *   tf?: string,
 *   tradeOpts?: object,
 *   statsMode?: string,
 *   signal?: { cancelled?: boolean },
 *   seedRows?: object[],
 *   onProgress?: (p: {
 *     done: number,
 *     total: number,
 *     rows: object[]
 *   }) => void
 * }} opts
 */
export async function scanAlgoStrategyParamOptimizeUniverse(opts = {}){
  const strategyId = normalizeAlgoOptimizeStrategyId(opts.strategyId);
  const tf = normalizeAlgoScanTf(opts.tf);
  const statsMode = normalizeAlgoStatsMode(opts.statsMode || "direct");
  const signal = opts.signal || { cancelled: false };
  const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;
  const historyRequests = ALGO_TICKER_SCAN_HISTORY_REQUESTS;

  /* Резюм после перехода между страницами: готовые тикеры не считаем заново. */
  const seedBySymbol = new Map();
  for(const row of Array.isArray(opts.seedRows) ? opts.seedRows : []){
    const sym = String(row?.symbol || "").trim().toUpperCase();
    if(sym){
      seedBySymbol.set(sym, row);
    }
  }

  const tradeOpts = {
    ...(opts.tradeOpts || {}),
    patternSettings: opts.tradeOpts?.patternSettings || readAlgoPattern12Settings(),
    chartTf: tf
  };

  const { items } = await resolveAlgoScanUniverseItems({
    universe: "all"
  });

  /** @type {object[]} */
  const rows = new Array(items.length);
  const total = items.length;
  let done = 0;
  let cursor = 0;

  if(seedBySymbol.size){
    for(let i = 0; i < items.length; i += 1){
      const seeded = seedBySymbol.get(
        String(items[i]?.symbol || "").trim().toUpperCase()
      );
      if(seeded){
        rows[i] = seeded;
        done += 1;
      }
    }
  }

  function emit(){
    if(!onProgress){
      return;
    }
    onProgress({
      done,
      total,
      rows: rows.filter(Boolean)
    });
  }

  async function worker(){
    while(cursor < items.length){
      if(signal.cancelled){
        return;
      }

      const index = cursor++;
      const item = items[index];

      if(rows[index]){
        continue;
      }

      try{
        const candles = await loadMarketHistory(
          item.symbol,
          tf,
          historyRequests,
          {
            parallel: true,
            batchGapMs: 0
          }
        );

        if(signal.cancelled){
          return;
        }

        if(!candles || !candles.length){
          rows[index] = {
            rank: item.rank,
            symbol: item.symbol,
            turnover24h: item.turnover24h,
            skipped: true,
            error: "bars=0",
            paramsBrief: "—",
            closed: 0,
            netUsd: null
          };
        }else{
          const result = await optimizeAlgoStrategyParams({
            candles,
            strategyId,
            symbol: item.symbol,
            fixedOpts: {
              ...tradeOpts,
              symbol: item.symbol
            },
            statsMode,
            signal,
            yieldEvery: 120
          });

          if(signal.cancelled){
            return;
          }

          const closed = Number(result?.bestStats?.closed);
          const hasTrades = Number.isFinite(closed) && closed > 0;

          if(!result?.best || !result?.bestStats || !hasTrades){
            rows[index] = {
              rank: item.rank,
              symbol: item.symbol,
              turnover24h: item.turnover24h,
              skipped: true,
              error: result?.cancelled
                ? "cancelled"
                : (result?.best ? "0 сделок" : "no best"),
              paramsBrief: "—",
              closed: 0,
              netUsd: null
            };
          }else{
            const netUsd = Number(result.bestStats.netUsd);
            rows[index] = {
              rank: item.rank,
              symbol: item.symbol,
              turnover24h: item.turnover24h,
              skipped: false,
              tf,
              paramsBrief: formatAlgoOptimizeParamsBrief(strategyId, result.best),
              closed,
              wins: Number(result.bestStats.wins) || 0,
              losses: Number(result.bestStats.losses) || 0,
              netUsd: Number.isFinite(netUsd) ? netUsd : null,
              winRate: result.bestStats.winRate,
              expectancyR: result.bestStats.expectancyR,
              maxDrawdownUsd: Number.isFinite(Number(result.bestStats.maxDrawdownUsd))
                ? Number(result.bestStats.maxDrawdownUsd)
                : null,
              best: result.best,
              patch: comboToApplyPatch(strategyId, result.best)
            };
          }
        }
      }catch(err){
        rows[index] = {
          rank: item.rank,
          symbol: item.symbol,
          turnover24h: item.turnover24h,
          skipped: true,
          error: String(err?.message || err || "error"),
          paramsBrief: "—",
          closed: 0,
          netUsd: null
        };
      }

      done += 1;
      emit();

      if(ALGO_TICKER_SCAN_DELAY_MS > 0){
        await sleep(ALGO_TICKER_SCAN_DELAY_MS);
      }
    }
  }

  emit();

  const workers = Array.from(
    { length: Math.max(1, ALGO_OPTIMIZE_UNIVERSE_CONCURRENCY) },
    () => worker()
  );
  await Promise.all(workers);

  return {
    strategyId,
    tf,
    statsMode,
    historyRequests,
    cancelled: !!signal.cancelled,
    done,
    total,
    rows: rows.filter(Boolean)
  };
}
