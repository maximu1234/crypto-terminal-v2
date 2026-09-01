/**
 * Open-position range overlay for scalping DOM (price column fill).
 * Exit edge sticks to book: long → best bid, short → best ask.
 * Reads thin facade only — no Bybit/BingX imports.
 */
import {
listCachedPositionsForSymbol
} from "../trade-positions-cache.js?v=35";

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

function isLongSide(
position
){

const side =
String(
position?.side ||
""
).toLowerCase();
const positionSide =
String(
position?.positionSide ||
""
).toLowerCase();

if(
positionSide ===
"long" ||
side ===
"buy" ||
side ===
"long"
){
return true;
}

if(
positionSide ===
"short" ||
side ===
"sell" ||
side ===
"short"
){
return false;
}

const size =
Number(
position?.size
);

return size >=
0;

}

function readEntry(
position
){

const n =
Number(
position?.avgPrice
);

return Number.isFinite(
n
) &&
n >
0
? n
: 0;

}

/**
 * Exit reference for DOM fill:
 * long closes by selling into bids → bestBid
 * short closes by buying into asks → bestAsk
 */
function readExitPrice(
long,
bestBid,
bestAsk,
fallback
){

if(
long
){
if(
Number.isFinite(
bestBid
) &&
bestBid >
0
){
return bestBid;
}
}else if(
Number.isFinite(
bestAsk
) &&
bestAsk >
0
){
return bestAsk;
}

if(
Number.isFinite(
fallback
) &&
fallback >
0
){
return fallback;
}

return 0;

}

/**
 * @param {string} symbol
 * @param {{ mid?: number, bestBid?: number, bestAsk?: number }} bookTouch
 * @returns {{ entry: number, current: number, tone: "profit" | "loss", long: boolean }[]}
 */
export function resolvePositionOverlays(
symbol,
bookTouch =
{}
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

const bestBid =
Number(
bookTouch.bestBid
);
const bestAsk =
Number(
bookTouch.bestAsk
);
const fallback =
Number(
bookTouch.mid
);

let list =
[];

try{
list =
listCachedPositionsForSymbol(
sym
) ||
[];
}catch{
return [];
}

const overlays =
[];

for(
const position of
list
){
const size =
Math.abs(
Number(
position?.size
) ||
0
);

if(
!(
size >
0
)
){
continue;
}

const entry =
readEntry(
position
);
const long =
isLongSide(
position
);
const current =
readExitPrice(
long,
bestBid,
bestAsk,
fallback
);

if(
!(
entry >
0
) ||
!(
current >
0
)
){
continue;
}

const profit =
long
? current >=
entry
: current <=
entry;

overlays.push(
{
entry,
current,
long,
tone:
profit
? "profit"
: "loss"
}
);

}

return overlays;

}

function overlayExitPrice(overlay, lastAsk, lastBid){
  if(overlay.long === true && lastBid > 0){
    return lastBid;
  }
  if(overlay.long === false && lastAsk > 0){
    return lastAsk;
  }
  return overlay.current;
}

function rowInPositionFill(row, overlay, lastAsk, lastBid, eps){
  const current = overlayExitPrice(overlay, lastAsk, lastBid);
  const lo = Math.min(overlay.entry, current);
  const hi = Math.max(overlay.entry, current);
  return row.price >= lo - eps && row.price <= hi + eps;
}

/**
 * @param {ReturnType<import("./depth-store.js").buildLadderFromBook>} ladder
 * @param {{ entry: number, current: number, tone: "profit" | "loss", long?: boolean }[]} overlays
 */
export function applyPositionOverlays(
ladder,
overlays
){

if(
!ladder?.rows?.length
){
return ladder;
}

const hasOpenPosition =
Array.isArray(
overlays
) &&
overlays.length >
0;

if(
!hasOpenPosition
){
return {
...ladder,
hasOpenPosition:
false
};
}

const nativeTick =
Number(
ladder.nativeTick
) ||
0;
const displayTick =
Number(
ladder.tick
) ||
0;
const eps =
(
nativeTick >
0
? nativeTick
: displayTick
) *
0.51 ||
1e-12;

const rows =
ladder.rows;

let lastAsk =
0;
let lastBid =
0;

for(
const row of
rows
){
if(
row.touchAsk
){
lastAsk =
row.price;
}
if(
row.touchBid
){
lastBid =
row.price;
}
}

for(
const row of
rows
){
let tone =
null;

for(
const overlay of
overlays
){
if(
rowInPositionFill(
row,
overlay,
lastAsk,
lastBid,
eps
)
){
tone =
overlay.tone;
}

}

row.positionFill =
tone;

}

return {
...ladder,
hasOpenPosition:
true,
positionExit:
overlays[
0
]?.long ===
true
? "bid"
: overlays[
0
]?.long ===
false
? "ask"
: ""
};

}

/**
 * @returns {{ price: number, kind: "sl" | "tp", long: boolean }[]}
 */
export function resolveSlTpPrices(
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

let list =
[];

try{
list =
listCachedPositionsForSymbol(
sym
) ||
[];
}catch{
return [];
}

const levels =
[];
const seen =
new Set();

for(
const position of
list
){
const size =
Math.abs(
Number(
position?.size
) ||
0
);

if(
!(
size >
0
)
){
continue;
}

const long =
isLongSide(
position
);

for(
const [
key,
kind
] of
[
[
"stopLoss",
"sl"
],
[
"takeProfit",
"tp"
]
]
){
const level =
Number(
position?.[
key
]
);

if(
!Number.isFinite(
level
) ||
!(
level >
0
)
){
continue;
}

const id =
`${kind}:${level}`;

if(
seen.has(
id
)
){
continue;
}

seen.add(
id
);
levels.push(
{
price:
level,
kind,
long
}
);
}

}

return levels;

}

/**
 * Marks the nearest ladder row for each SL/TP: sl-long | sl-short | tp-long | tp-short
 */
export function applySlTpHighlights(
ladder,
levels
){

if(
!ladder?.rows?.length ||
!levels?.length
){
return ladder;
}

/** @type {Map<number, string>} */
const markAt =
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
const kind =
level.kind ===
"tp"
? "tp"
: "sl";
const side =
level.long
? "long"
: "short";
const mark =
`${kind}-${side}`;

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
markAt.set(
i,
mark
);
break;
}

}

}

for(
let i =
0;
i <
rows.length;
i++
){
const mark =
markAt.get(
i
) ||
null;
rows[
i
].slTpHighlight =
!!mark;
rows[
i
].slTpMark =
mark;
}

return ladder;

}
