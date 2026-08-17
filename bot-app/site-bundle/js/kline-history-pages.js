/**
 * Оценка `end` для параллельной догрузки kline-страниц (Bybit / BingX, limit=1000).
 * Не торговая policy: только календарный сдвиг страниц, чтобы не ждать page N-1.
 */

export function klineTfToMs(tf){
  const t = String(tf || "").trim();
  if(t === "D"){
    return 86_400_000;
  }
  if(t === "W"){
    return 604_800_000;
  }
  if(t === "M"){
    return 2_592_000_000;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n * 60_000 : 0;
}

/**
 * Newest page first: i=0 → endMs, i=1 → endMs − 1000×tf, …
 * Пустой массив — tf неизвестен, вызывающий код должен идти последовательно.
 *
 * @param {number} endMs
 * @param {string} tf
 * @param {number} requests
 * @param {number} [limit=1000]
 * @returns {number[]}
 */
export function klineHistoryPageEnds(endMs, tf, requests, limit = 1000){
  const tfMs = klineTfToMs(tf);
  const n = Math.max(1, Math.floor(Number(requests) || 1));
  const end0 = Math.floor(Number(endMs) || 0);
  const pageSize = Math.max(1, Math.floor(Number(limit) || 1000));
  if(!(tfMs > 0) || !(end0 > 0)){
    return [];
  }
  const pageMs = pageSize * tfMs;
  const ends = [];
  for(let i = 0; i < n; i++){
    ends.push(end0 - i * pageMs);
  }
  return ends;
}

/**
 * Параллельные страницы — только длинная история (алго 10×1000).
 * Скринер / зум-окно / Вотчлист грузят 2 страницы: там sequential надёжнее
 * (не раздувать пачку HTTP вместе с сеткой виджетов).
 */
export const KLINE_PARALLEL_MIN_PAGES =
4;

export function shouldFetchKlinePagesInParallel(
requests,
batchGapMs
){
  return batchGapMs === 0
    && Math.floor(Number(requests) || 0) >= KLINE_PARALLEL_MIN_PAGES;
}
