/**
 * Trigger (stop) order underlines on scalping DOM.
 * Same between-row dashed style as alerts; colors match chart orders.
 * Uses mapped open orders from desktop trading IPC / stream events —
 * no Bybit/BingX imports.
 */
function normalizeSymbol(
raw
){

return String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
).replace(
/[^A-Z0-9]/g,
""
);

}

function toneFromOrder(
order
){

const badge =
String(
order?.badgeSide ||
""
).toLowerCase();

if(
badge ===
"long"
){
return "long";
}

if(
badge ===
"short"
){
return "short";
}

const side =
String(
order?.side ||
""
).toLowerCase();

if(
side ===
"buy" ||
side ===
"long"
){
return "long";
}

return "short";

}

/** @type {{ price: number, tone: "long" | "short" }[]} */
let cachedStops =
[];

/**
 * Ingest mapped open-orders list (stream or REST).
 * Keeps only stop/trigger entries.
 */
export function ingestOpenOrders(
orders
){

const next =
[];

if(
!Array.isArray(
orders
)
){
cachedStops =
next;
return;
}

for(
const order of
orders
){
if(
String(
order?.orderKind ||
""
).toLowerCase() !==
"stop"
){
continue;
}

const price =
Number(
order?.price
);

if(
!Number.isFinite(
price
) ||
!(
price >
0
)
){
continue;
}

next.push(
{
price,
tone:
toneFromOrder(
order
),
symbol:
normalizeSymbol(
order?.symbol
)
}
);

}

cachedStops =
next;

}

export function resolveTriggerLevels(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return [];
}

return cachedStops.filter(
row=>
row.symbol ===
sym
);

}

/**
 * Underline row above each trigger price (between that row and next lower).
 * Ladder high → low. tone: "long" | "short".
 */
export function applyTriggerUnderlines(
ladder,
levels
){

if(
!ladder?.rows?.length ||
!levels?.length
){
return ladder;
}

/** @type {Map<number, "long" | "short">} */
const underlineAt =
new Map();
const rows =
ladder.rows;

for(
const level of
levels
){
const price =
Number(
level.price
);
const tone =
level.tone ===
"long"
? "long"
: "short";

if(
!Number.isFinite(
price
) ||
!(
price >
0
)
){
continue;
}

for(
let i =
0;
i <
rows.length;
i++
){
const rowPrice =
rows[
i
].price;
const next =
rows[
i +
1
];
const nextPrice =
next
? next.price
: -
Infinity;

if(
rowPrice >=
price &&
nextPrice <
price
){
underlineAt.set(
i,
tone
);
break;
}

}

}

return {
...ladder,
rows:
rows.map(
(
row,
i
)=>
({
...row,
triggerUnderline:
underlineAt.get(
i
) ||
null
})
)
};

}

export async function hydrateOpenOrdersFromApi(){

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.getOpenOrders
){
return;
}

try{
const result =
await api.getOpenOrders();
ingestOpenOrders(
result?.orders
);
}catch{
/* ignore */
}

}
