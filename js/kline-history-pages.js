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

/** Сколько страниц kline держать в полёте. Больше — Bybit режет часть ответов, и в ряде остаются дыры. */
export const KLINE_PAGE_CONCURRENCY =
4;

export function shouldFetchKlinePagesInParallel(
requests,
batchGapMs
){
  return batchGapMs === 0
    && Math.floor(Number(requests) || 0) >= KLINE_PARALLEL_MIN_PAGES;
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<unknown>} fn
 */
export async function mapWithConcurrency(items, concurrency, fn){
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  if(!list.length){
    return out;
  }
  let next = 0;
  const workers = Math.max(
    1,
    Math.min(Math.floor(Number(concurrency) || 1), list.length)
  );

  async function worker(){
    for(;;){
      const index = next;
      next += 1;
      if(index >= list.length){
        return;
      }
      out[index] = await fn(list[index], index);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

/**
 * `end` (мс) страниц, которыми можно закрыть дыры длиннее одного бара.
 * Плотный ряд и молодой хвост без обрыва — пустой список.
 * @param {Array<{time:number}>} candles time в секундах или мс
 * @param {string} tf
 * @param {number} [pageBars=1000]
 * @returns {number[]}
 */
export function klineGapFillEnds(candles, tf, pageBars = 1000){
  const tfMs = klineTfToMs(tf);
  const rows = Array.isArray(candles) ? candles : [];
  if(!(tfMs > 0) || rows.length < 2){
    return [];
  }
  const tfSec = tfMs / 1000;
  const pageSec = Math.max(1, Math.floor(Number(pageBars) || 1000)) * tfSec;
  const ends = [];
  for(let i = 1; i < rows.length; i++){
    const prev = Number(rows[i - 1]?.time);
    const next = Number(rows[i]?.time);
    if(!Number.isFinite(prev) || !Number.isFinite(next)){
      continue;
    }
    const prevSec = prev > 1e12 ? prev / 1000 : prev;
    const nextSec = next > 1e12 ? next / 1000 : next;
    if(!(nextSec - prevSec > tfSec)){
      continue;
    }
    let endSec = nextSec - tfSec;
    let guard = 0;
    while(endSec > prevSec && guard < 80){
      ends.push(Math.round(endSec * 1000));
      endSec -= pageSec;
      guard++;
    }
  }
  return ends;
}
