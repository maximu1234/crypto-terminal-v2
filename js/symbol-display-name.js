/**
 * Полное имя тикера в левом верхнем углу графика Терминала.
 * Bybit — instruments-info fullName (Bitcoin, Apple).
 * BingX в контракте отдаёт только тикер, поэтому имя берётся
 * из того же справочника Bybit, а своя подпись — если она не тикер.
 * Мосбиржа — короткое имя бумаги (Сбербанк, Газпром ао).
 */

import {
peekBybitSymbolsCache
} from "./api.js?v=36";

import {
fetchBybit
} from "./bybit-fetch.js?v=21";

import {
peekMarketSymbolsCache
} from "./market-api.js?v=11";

import {
EXCHANGE_CHANGED_EVENT
} from "./exchanges/context.js?v=1";

import {
fetchBingx
} from "./exchanges/bingx/fetch.js?v=5";

import {
fetchMoex,
issBlockToRows
} from "./exchanges/moex/fetch.js?v=1";

import {
MOEX_BOARD_SPECS
} from "./exchanges/moex/listings.js?v=2";

const ACRONYMS =
new Set([
"ai",
"io",
"nft",
"dao",
"dex",
"usd"
]);

/** Контракты с пустым fullName у Bybit — имя базового актива. */
const MULTIPLIER_NAMES =
Object.freeze({
"1000PEPEUSDT":
"Pepe",
"1000BONKUSDT":
"Bonk",
"1000FLOKIUSDT":
"Floki",
"1000LUNCUSDT":
"Luna Classic",
"1000XECUSDT":
"eCash",
"1000BTTUSDT":
"BitTorrent",
"1000TURBOUSDT":
"Turbo",
"1000TOSHIUSDT":
"Toshi",
"1000RATSUSDT":
"Rats",
"1000NEIROCTOUSDT":
"Neiro",
"10000SATSUSDT":
"Satoshi",
"1000000MOGUSDT":
"Mog",
"1000000BABYDOGEUSDT":
"Baby Doge",
"SHIB1000USDT":
"Shiba Inu",
"LUNA2USDT":
"Terra"
});

const resolvedNames =
new Map();

const pendingNames =
new Map();

export function canonicalChartSymbol(
symbol
){

return String(
symbol ||
""
)
.replace(
/\.P$/i,
""
)
.replace(
/-/g,
""
)
.trim()
.toUpperCase();

}

function titleCaseSlug(
slug
){

const parts =
String(
slug ||
""
)
.split(
"-"
)
.filter(
Boolean
);

if(
parts.length >
1 &&
/^\d+$/.test(
parts[
parts.length -
1
]
)
){
parts.pop();
}

return parts.map(
part=>{

const low =
part.toLowerCase();

if(
ACRONYMS.has(
low
)
){
return low.toUpperCase();
}

if(
part.length ===
1
){
return part.toUpperCase();
}

return part.charAt(
0
).toUpperCase() +
part.slice(
1
).toLowerCase();

}
)
.join(
" "
);

}

function foldedToken(
value
){

return String(
value ||
""
)
.replace(
/[^a-z0-9]/gi,
""
)
.toUpperCase();

}

/**
 * @param {string} fullName
 * @param {string} baseCoin
 * @param {string} symbol
 * @returns {string} пустая строка — подпись не нужна
 */
export function formatInstrumentFullName(
fullName,
baseCoin,
symbol
){

const sym =
canonicalChartSymbol(
symbol
);

const base =
String(
baseCoin ||
""
).trim();

let name =
String(
fullName ||
""
).trim();

if(
name &&
!/\s/.test(
name
) &&
name.includes(
"-"
) &&
name ===
name.toLowerCase()
){
name =
titleCaseSlug(
name
);
}

if(
!name
){
name =
MULTIPLIER_NAMES[
sym
] ||
"";
}

if(
sym ===
"XAUUSDT" &&
(
!name ||
name.toUpperCase() ===
"XAU"
)
){
name =
"Gold";
}

if(
!name
){
return "";
}

const folded =
foldedToken(
name
);

const baseFold =
foldedToken(
base
);

const symBase =
sym.endsWith(
"USDT"
)
? sym.slice(
0,
-4
)
: sym;

if(
folded ===
baseFold ||
folded ===
sym ||
folded ===
symBase
){
return "";
}

return name;

}

function polishCyrillicName(
value
){

const text =
String(
value ||
""
).trim();

if(
!text
){
return "";
}

const words =
text.split(
/\s+/
);

const cyrillicOnly =
words.every(
word=>
/^[а-яё]{1,3}$/i.test(
word
) ||
(
/[А-Яа-яЁё]/.test(
word
) &&
!/[A-Za-z]/.test(
word
)
)
);

if(
!cyrillicOnly
){
return text;
}

return words.map(
word=>{

if(
/^[а-яё]{1,3}$/.test(
word
)
){
return word;
}

const letters =
word.replace(
/[^А-Яа-яЁё]/g,
""
);

if(
letters.length >
1 &&
letters ===
letters.toUpperCase()
){
return word.charAt(
0
).toUpperCase() +
word.slice(
1
).toLowerCase();
}

return word;

}
)
.join(
" "
);

}

/**
 * @param {{ shortname?: string, latname?: string, name?: string, SHORTNAME?: string, LATNAME?: string, NAME?: string, SECNAME?: string }} fields
 * @param {string} symbol
 */
export function formatMoexDisplayName(
fields,
symbol
){

const sym =
String(
symbol ||
""
).trim()
.toUpperCase();

const shortname =
String(
fields?.shortname ||
fields?.SHORTNAME ||
""
).trim();

const latname =
String(
fields?.latname ||
fields?.LATNAME ||
""
).trim();

const legal =
String(
fields?.name ||
fields?.NAME ||
fields?.secname ||
fields?.SECNAME ||
""
).trim();

const candidates =
[];

if(
/[А-Яа-яЁё]/.test(
shortname
)
){
candidates.push(
polishCyrillicName(
shortname
)
);
}

if(
latname
){
candidates.push(
latname
);
}

if(
legal
){
candidates.push(
legal
);
}

if(
shortname
){
candidates.push(
shortname
);
}

const symFold =
foldedToken(
sym
);

const symBare =
foldedToken(
sym.replace(
/-/g,
""
)
);

for(
const raw of
candidates
){

const text =
String(
raw ||
""
).trim();

if(
!text
){
continue;
}

const fold =
foldedToken(
text
);

if(
fold ===
symFold ||
fold ===
symBare
){
continue;
}

return text;

}

return "";

}

/**
 * Подпись BingX, когда это не код контракта: Natural Gas, 哈基米.
 * @param {string} displayName
 * @param {string} symbol
 */
export function formatBingxDisplayLabel(
displayName,
symbol
){

let label =
String(
displayName ||
""
).trim()
.replace(
/-USDT$/i,
""
)
.trim();

if(
!label
){
return "";
}

const paren =
label.match(
/^(.*?)\s*\(([A-Za-z0-9]{1,8})\)$/
);

if(
paren &&
paren[
1
].trim() &&
(
/[a-z\s]/.test(
paren[
1
]
) ||
/[^\u0000-\u007f]/.test(
paren[
1
]
)
)
){
label =
paren[
1
].trim();
}

if(
foldedToken(
label
) ===
""
){
return label;
}

const tickerLike =
/^[A-Z0-9()]+$/.test(
label
) &&
!/\s/.test(
label
);

if(
tickerLike
){
return "";
}

return formatInstrumentFullName(
label,
"",
symbol
);

}

/**
 * AAPL-USDT / GOLD(XAU)-USDT → символ Bybit, если он другой.
 * @param {string} displayName
 * @param {string} canonical
 */
export function bybitSymbolFromBingxDisplay(
displayName,
canonical
){

const label =
String(
displayName ||
""
).trim()
.replace(
/-USDT$/i,
""
);

const paren =
label.match(
/\(([A-Z]{2,6})\)$/
);

if(
paren
){

const code =
canonicalChartSymbol(
`${paren[1]}USDT`
);

if(
code &&
code !==
canonical
){
return code;
}

}

const head =
label.split(
"("
)[
0
].replace(
/[^A-Za-z]/g,
""
)
.toUpperCase();

if(
/^[A-Z]{2,10}$/.test(
head
)
){

const code =
`${head}USDT`;

if(
code !==
canonical
){
return code;
}

}

return "";

}

function nameFromCatalog(
symbol
){

const list =
peekBybitSymbolsCache();

if(
!Array.isArray(
list
) ||
!list.length
){
return null;
}

const item =
list.find(
row=>
canonicalChartSymbol(
row?.symbol
) ===
symbol
);

if(
!item ||
typeof item !==
"object" ||
!Object.prototype.hasOwnProperty.call(
item,
"fullName"
)
){
return null;
}

return formatInstrumentFullName(
item.fullName,
item.baseCoin,
symbol
);

}

async function nameFromNetwork(
symbol
){

const {
json
} =
await fetchBybit(
`/v5/market/instruments-info?category=linear&symbol=${encodeURIComponent(symbol)}`,
{
timeoutMs:
8000,
retries:
1,
sequential:
true
}
);

const item =
json?.result?.list?.[
0
];

return formatInstrumentFullName(
item?.fullName,
item?.baseCoin,
symbol
);

}

function normalizeExchange(
exchangeId
){

const id =
String(
exchangeId ||
"bybit"
).trim()
.toLowerCase();

if(
id ===
"bingx" ||
id ===
"moex"
){
return id;
}

return "bybit";

}

function symbolKey(
exchange,
symbol
){

if(
exchange ===
"moex"
){
return String(
symbol ||
""
).trim()
.toUpperCase();
}

return canonicalChartSymbol(
symbol
);

}

function rememberKey(
exchange,
symbol
){

return `${exchange}:${symbolKey(
exchange,
symbol
)}`;

}

function findCachedInstrument(
exchange,
symbol
){

const list =
peekMarketSymbolsCache(
exchange
);

if(
!Array.isArray(
list
)
){
return null;
}

return list.find(
row=>{

const raw =
exchange ===
"moex"
? String(
row?.symbol ||
""
).trim()
.toUpperCase()
: canonicalChartSymbol(
row?.symbol
);

return raw ===
symbol;

}
) ||
null;

}

function bingxDisplayOf(
item
){

return String(
item?.raw?.displayName ||
item?.displayName ||
""
).trim();

}

let bingxContractsTask =
null;

function loadBingxContracts(){

if(
!bingxContractsTask
){

bingxContractsTask =
fetchBingx(
"/openApi/swap/v2/quote/contracts",
{
timeoutMs:
8000,
retries:
1
}
)
.then(
json=>
Array.isArray(
json?.data
)
? json.data
: []
)
.catch(
()=>
[]
);

}

return bingxContractsTask;

}

async function bingxDisplayFromNetwork(
symbol
){

const rows =
await loadBingxContracts();

const hit =
rows.find(
row=>
canonicalChartSymbol(
row?.symbol
) ===
symbol
);

return String(
hit?.displayName ||
""
).trim();

}

async function bybitName(
symbol
){

const cached =
nameFromCatalog(
symbol
);

if(
cached !=
null
){
return cached;
}

try{

return await nameFromNetwork(
symbol
);

}catch{
return "";
}

}

async function resolveBingxName(
symbol
){

const local =
formatInstrumentFullName(
"",
"",
symbol
);

if(
local
){
return local;
}

const direct =
await bybitName(
symbol
);

if(
direct
){
return direct;
}

let display =
bingxDisplayOf(
findCachedInstrument(
"bingx",
symbol
)
);

if(
!display
){
display =
await bingxDisplayFromNetwork(
symbol
);
}

const alt =
bybitSymbolFromBingxDisplay(
display,
symbol
);

if(
alt
){

const altName =
await bybitName(
alt
);

if(
altName
){
return altName;
}

}

return formatBingxDisplayLabel(
display,
symbol
);

}

function moexFieldsFromItem(
item
){

const sec =
item?.raw?.securities ||
{};

return {
shortname:
item?.shortname ||
sec.SHORTNAME ||
sec.shortname ||
"",
latname:
sec.LATNAME ||
sec.latname ||
"",
name:
sec.NAME ||
sec.name ||
sec.SECNAME ||
sec.secname ||
""
};

}

async function moexNameFromNetwork(
symbol
){

for(
const spec of
MOEX_BOARD_SPECS
){

try{

const json =
await fetchMoex(
`/iss/engines/${spec.engine}/markets/${spec.market}/boards/${spec.board}/securities/${encodeURIComponent(
symbol
)}.json?iss.meta=off&iss.only=securities`,
{
timeoutMs:
8000,
retries:
0
}
);

const row =
issBlockToRows(
json?.securities
)[
0
];

if(
!row
){
continue;
}

const name =
formatMoexDisplayName(
row,
symbol
);

if(
name
){
return name;
}

}catch{
/* следующий борд */
}

}

return "";

}

async function resolveMoexName(
symbol
){

const item =
findCachedInstrument(
"moex",
symbol
);

if(
item
){
return formatMoexDisplayName(
moexFieldsFromItem(
item
),
symbol
);
}

return moexNameFromNetwork(
symbol
);

}

async function resolveBybitName(
symbol
){

const local =
formatInstrumentFullName(
"",
"",
symbol
);

if(
local
){
return local;
}

const cached =
nameFromCatalog(
symbol
);

if(
cached !=
null
){
return cached;
}

return nameFromNetwork(
symbol
);

}

export function resolveSymbolDisplayName(
symbol,
exchangeId
){

const exchange =
normalizeExchange(
exchangeId
);

const sym =
symbolKey(
exchange,
symbol
);

const key =
rememberKey(
exchange,
symbol
);

if(
!sym
){
return Promise.resolve(
""
);
}

if(
resolvedNames.has(
key
)
){
return Promise.resolve(
resolvedNames.get(
key
) ||
""
);
}

if(
pendingNames.has(
key
)
){
return pendingNames.get(
key
);
}

const task =
Promise.resolve()
.then(
()=>{

if(
exchange ===
"moex"
){
return resolveMoexName(
sym
);
}

if(
exchange ===
"bingx"
){
return resolveBingxName(
sym
);
}

return resolveBybitName(
sym
);

}
)
.then(
name=>{

const text =
name ||
"";

resolvedNames.set(
key,
text
);

return text;

}
)
.catch(
()=>{

return "";

}
)
.finally(
()=>{

pendingNames.delete(
key
);

}
);

pendingNames.set(
key,
task
);

return task;

}

export function forgetEmptySymbolDisplayName(
symbol,
exchangeId
){

const key =
rememberKey(
normalizeExchange(
exchangeId
),
symbol
);

if(
resolvedNames.get(
key
) ===
""
){
resolvedNames.delete(
key
);
}

}

export function mountChartSymbolFullName(
{
getSymbol,
getExchange
} = {}
){

const wrap =
document.getElementById(
"chart-wrap"
);

if(
!wrap ||
wrap.querySelector(
".chart-symbol-fullname"
)
){
return;
}

const el =
document.createElement(
"div"
);

el.className =
"chart-symbol-fullname";
el.hidden =
true;

wrap.appendChild(
el
);

let seq =
0;

async function refresh(){

const my =
++seq;

const symbol =
typeof getSymbol ===
"function"
? getSymbol()
: "";

const exchange =
typeof getExchange ===
"function"
? getExchange()
: "bybit";

const name =
await resolveSymbolDisplayName(
symbol,
exchange
);

if(
my !==
seq
){
return;
}

if(
!name
){
el.hidden =
true;
el.textContent =
"";
return;
}

el.hidden =
false;
el.textContent =
name;

}

window.addEventListener(
"coins-chart-symbol-changed",
refresh
);

function forgetCurrent(){

forgetEmptySymbolDisplayName(
typeof getSymbol ===
"function"
? getSymbol()
: "",
typeof getExchange ===
"function"
? getExchange()
: "bybit"
);

}

window.addEventListener(
"bybit-symbols-updated",
()=>{

forgetCurrent();
refresh();

}
);

window.addEventListener(
"market-symbols-updated",
()=>{

forgetCurrent();
refresh();

}
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{

forgetCurrent();
refresh();

}
);

refresh();

}
