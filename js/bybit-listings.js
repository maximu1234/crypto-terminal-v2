/* =========================================================
   Bybit: недавние листинги
========================================================= */

/** Монеты → Новые (последние 7 дней). */
export const BYBIT_NEW_LISTING_WINDOW_MS =
7 * 24 * 60 * 60 * 1000;

/** Страница Листинги: показываем не старше года, старше отбрасываем. */
export const BYBIT_LISTINGS_PAGE_WINDOW_MS =
365 * 24 * 60 * 60 * 1000;

/**
 * @param {Array<{ symbol: string, launchTime?: string|number, baseCoin?: string }>} instruments
 * @param {number} [windowMs]
 */
export function filterRecentListings(
instruments,
windowMs = BYBIT_NEW_LISTING_WINDOW_MS
){

const cutoff =
Date.now() - windowMs;

return instruments
.filter(item => {

if(!item?.launchTime){
return false;
}

return Number(item.launchTime) > cutoff;

})
.map(item => ({

symbol: item.symbol,
launchTime: Number(item.launchTime),
baseCoin: item.baseCoin || ""

}))
.sort((a, b) => b.launchTime - a.launchTime);

}

export function formatListingDateTime(ts){

return new Date(ts).toLocaleString("ru-RU", {

year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit"

});

}