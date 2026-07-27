/**
 * TradingView watchlist export → canonical USDT symbols for Script scan.
 * Example: BYBIT:HYPEUSDT.P,BYBIT:LABUSDT.P → HYPEUSDT, LABUSDT
 */

const EXCHANGE_PREFIX =
{
bybit:
"BYBIT",
bingx:
"BINGX"
};

export function normalizeScriptFavoritesExchangeId(
exchangeId
){

const id =
String(
exchangeId ||
""
).trim().toLowerCase();

return id ===
"bingx"
? "bingx"
: "bybit";

}

export function normalizeScriptFavoritesSide(
side
){

const s =
String(
side ||
""
).trim().toLowerCase();

return s ===
"short"
? "short"
: "long";

}

export function scriptFavoritesFileName(
exchangeId,
side
){

return `script-favorites-${normalizeScriptFavoritesExchangeId(
exchangeId
)}-${normalizeScriptFavoritesSide(
side
)}.txt`;

}

/**
 * Which favorite sides are needed for a scan side filter.
 * @param {"both"|"long"|"short"} sideFilter
 * @returns {("long"|"short")[]}
 */
export function favoriteSidesForScanFilter(
sideFilter
){

const mode =
String(
sideFilter ||
"both"
).trim().toLowerCase();

if(
mode ===
"long"
){
return [
"long"
];
}

if(
mode ===
"short"
){
return [
"short"
];
}

return [
"long",
"short"
];

}

/**
 * @param {string} token
 * @param {"bybit"|"bingx"} exchangeId
 * @returns {{ symbol: string|null, skippedForeign: boolean }}
 */
export function normalizeTradingViewSymbolToken(
token,
exchangeId =
"bybit"
){

const ex =
normalizeScriptFavoritesExchangeId(
exchangeId
);
const expected =
EXCHANGE_PREFIX[
ex
];
let raw =
String(
token ||
""
).trim();

if(
!raw
){
return {
symbol:
null,
skippedForeign:
false
};
}

const colon =
raw.indexOf(
":"
);

if(
colon >
0
){
const prefix =
raw.slice(
0,
colon
).trim().toUpperCase();
raw =
raw.slice(
colon +
1
).trim();

if(
prefix &&
prefix !==
expected
){
return {
symbol:
null,
skippedForeign:
true
};
}
}

let symbol =
raw.replace(
/\.P$/i,
""
).trim().toUpperCase();

symbol =
symbol.replace(
/[^A-Z0-9]/g,
""
);

if(
!symbol
){
return {
symbol:
null,
skippedForeign:
false
};
}

return {
symbol,
skippedForeign:
false
};

}

/**
 * @param {string} text
 * @param {{ exchangeId?: string }} [options]
 * @returns {{ symbols: string[], skippedForeign: number, totalTokens: number }}
 */
export function parseTradingViewSymbolList(
text,
options =
{}
){

const exchangeId =
normalizeScriptFavoritesExchangeId(
options.exchangeId
);
const chunks =
String(
text ||
""
).split(
/[\s,;]+/
);
const seen =
new Set();
const symbols =
[];
let skippedForeign =
0;
let totalTokens =
0;

for(
const chunk of chunks
){

const trimmed =
chunk.trim();

if(
!trimmed
){
continue;
}

totalTokens +=
1;

const {
symbol,
skippedForeign: foreign
} =
normalizeTradingViewSymbolToken(
trimmed,
exchangeId
);

if(
foreign
){
skippedForeign +=
1;
continue;
}

if(
!symbol ||
seen.has(
symbol
)
){
continue;
}

seen.add(
symbol
);
symbols.push(
symbol
);

}

return {
symbols,
skippedForeign,
totalTokens
};

}

/**
 * Keep only favorites that exist on the live market list.
 * @param {string[]} favorites
 * @param {string[]} marketSymbols
 * @returns {string[]}
 */
export function intersectFavoritesWithMarket(
favorites,
marketSymbols
){

const market =
new Set(
(
Array.isArray(
marketSymbols
)
? marketSymbols
: []
).map(
s=>
String(
s ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
)
).filter(
Boolean
)
);

const out =
[];
const seen =
new Set();

for(
const raw of
Array.isArray(
favorites
)
? favorites
: []
){

const symbol =
String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!symbol ||
seen.has(
symbol
) ||
!market.has(
symbol
)
){
continue;
}

seen.add(
symbol
);
out.push(
symbol
);

}

return out;

}

/**
 * Load favorites text from desktop userData and parse for active exchange + side.
 * @param {string} [exchangeId]
 * @param {"long"|"short"} [side]
 * @returns {Promise<{ ok: boolean, symbols: string[], fileName: string, exists: boolean, side: string, message?: string }>}
 */
export async function loadScriptFavoritesSymbols(
exchangeId,
side =
"long"
){

const ex =
normalizeScriptFavoritesExchangeId(
exchangeId
);
const s =
normalizeScriptFavoritesSide(
side
);
const api =
typeof window !==
"undefined"
? window.cryptoTerminalDesktop
: null;

if(
!api?.loadScriptFavorites
){
return {
ok:
false,
exists:
false,
side:
s,
symbols:
[],
fileName:
scriptFavoritesFileName(
ex,
s
),
message:
"Desktop API недоступен"
};
}

try{
const result =
await api.loadScriptFavorites(
ex,
s
);

if(
!result?.ok
){
return {
ok:
false,
exists:
false,
side:
s,
symbols:
[],
fileName:
scriptFavoritesFileName(
ex,
s
),
message:
result?.message ||
"Не удалось прочитать файл"
};
}

if(
!result.exists
){
return {
ok:
true,
exists:
false,
side:
s,
symbols:
[],
fileName:
result.fileName ||
scriptFavoritesFileName(
ex,
s
)
};
}

const parsed =
parseTradingViewSymbolList(
result.text,
{
exchangeId:
ex
}
);

return {
ok:
true,
exists:
true,
side:
s,
symbols:
parsed.symbols,
fileName:
result.fileName ||
scriptFavoritesFileName(
ex,
s
),
skippedForeign:
parsed.skippedForeign
};
}catch(
err
){
return {
ok:
false,
exists:
false,
side:
s,
symbols:
[],
fileName:
scriptFavoritesFileName(
ex,
s
),
message:
err?.message ||
String(
err
)
};
}

}

/**
 * Load favorites for scan direction: long / short / both (union with per-side sets).
 * @param {string} [exchangeId]
 * @param {"both"|"long"|"short"} [sideFilter]
 * @returns {Promise<{
 *   ok: boolean,
 *   exists: boolean,
 *   symbols: string[]|null,
 *   favoritesBySide: { long: string[], short: string[] }|null,
 *   message?: string
 * }>}
 */
export async function loadScriptFavoritesForScan(
exchangeId,
sideFilter =
"both"
){

const ex =
normalizeScriptFavoritesExchangeId(
exchangeId
);
const sides =
favoriteSidesForScanFilter(
sideFilter
);
const bySide =
{
long:
[],
short:
[]
};
let anyOk =
false;
let anyExists =
false;
const errors =
[];

for(
const side of sides
){

const fav =
await loadScriptFavoritesSymbols(
ex,
side
);

if(
!fav.ok
){
errors.push(
fav.message ||
side
);
continue;
}

anyOk =
true;

if(
fav.exists &&
fav.symbols.length
){
anyExists =
true;
bySide[
side
] =
fav.symbols;
}

}

if(
!anyOk &&
errors.length
){
return {
ok:
false,
exists:
false,
symbols:
null,
favoritesBySide:
null,
message:
errors[
0
] ||
"Не удалось прочитать избранные"
};
}

if(
!anyExists
){
return {
ok:
true,
exists:
false,
symbols:
null,
favoritesBySide:
null,
message:
"Сначала добавьте файл избранных"
};
}

if(
sides.length ===
1
){
const side =
sides[
0
];
return {
ok:
true,
exists:
true,
symbols:
bySide[
side
].slice(),
favoritesBySide:
null
};
}

return {
ok:
true,
exists:
true,
symbols:
null,
favoritesBySide:
{
long:
bySide.long.slice(),
short:
bySide.short.slice()
}
};

}
