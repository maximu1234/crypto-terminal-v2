import {
loadMarketSymbols,
getActiveExchangeDefinition,
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=5";

import {
buildAlertChartUrl
} from "./alert-deep-link-url.js?v=2";

import {
BYBIT_LISTINGS_PAGE_WINDOW_MS,
filterRecentListings,
formatListingDateTime
} from "./bybit-listings.js?v=5";

const statusEl =
document.getElementById("listings-status");

const listEl =
document.getElementById("listings-list");

const retentionDays =
Math.round(BYBIT_LISTINGS_PAGE_WINDOW_MS / (24 * 60 * 60 * 1000));

function exchangeLabel(){

return getActiveExchangeDefinition()?.name ||
"бирже";

}

function setStatus(text, isError = false){

if(!statusEl){
return;
}

statusEl.textContent = text;
statusEl.classList.toggle("is-error", isError);

}

function renderListings(rows){

if(!listEl){
return;
}

listEl.innerHTML = "";

if(!rows.length){

const empty =
document.createElement("li");

empty.className = "listings-empty";
empty.textContent =
`За последние ${retentionDays} дн. листингов на ${exchangeLabel()} не найдено.`;

listEl.appendChild(empty);
return;

}

for(const row of rows){

const li =
document.createElement("li");

const time =
document.createElement("span");

time.className = "listing-time";
time.textContent = formatListingDateTime(row.launchTime);

const link =
document.createElement("a");

link.className = "listing-symbol";
link.href =
buildAlertChartUrl({
symbol:
row.symbol,
exchangeId:
getActiveExchangeId()
}) ||
`/terminal.html?symbol=${encodeURIComponent(row.symbol)}`;
link.textContent = row.symbol;

li.append(time, link);
listEl.appendChild(li);

}

}

async function init(){

setStatus(
`Загрузка с ${exchangeLabel()}…`
);

try{

const instruments =
await loadMarketSymbols({
skipCache:
true
});

const rows =
filterRecentListings(
instruments,
BYBIT_LISTINGS_PAGE_WINDOW_MS
);

renderListings(rows);

const countLabel =
rows.length
? `${rows.length} ${rows.length === 1 ? "монета" : rows.length < 5 ? "монеты" : "монет"}`
: "0 монет";

setStatus(
`launchTime · не старше ${retentionDays} дн. · ${countLabel}`
);

}catch(err){

console.error(err);
setStatus(
err?.message ||
`Не удалось загрузить данные ${exchangeLabel()}`,
true
);

if(listEl){
listEl.innerHTML = "";
}

}

}

window.addEventListener(
"bybit-network-retry",
()=>{
void init();
}
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
void init();
}
);

init();
