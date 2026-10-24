/**
 * Снимок крупных лимиток по видимым монетам.
 * Глубина книги маленькая (не orderbook.1000). Графики этот модуль не трогает.
 */

export const DENSITY_SNAPSHOT_MS =
2000;

export const DENSITY_BOOK_DEPTH =
50;

export const DENSITY_MIN_NOTIONAL =
1000;

export const DENSITY_BATCH =
3;

export const DENSITY_WALLS_PER_BOOK =
4;

function levelNotional(
level
){

const price =
Number(
level?.price
);
const size =
Number(
level?.size
);

if(
!Number.isFinite(
price
) ||
!Number.isFinite(
size
) ||
price <=
0 ||
size <=
0
){
return null;
}

return {
price,
size,
notional:
price *
size
};

}

/**
 * @param {{ bids?: {price:number,size:number}[], asks?: {price:number,size:number}[] }} book
 * @param {number} minNotional
 * @returns {{ side: "bid"|"ask", price: number, size: number, notional: number, distancePct: number }[]}
 */
export function wallsFromBook(
book,
minNotional =
DENSITY_MIN_NOTIONAL
){

const bids =
Array.isArray(
book?.bids
)
? book.bids
: [];
const asks =
Array.isArray(
book?.asks
)
? book.asks
: [];
const bestBid =
Number(
bids[0]?.price
);
const bestAsk =
Number(
asks[0]?.price
);
const mid =
Number.isFinite(
bestBid
) &&
Number.isFinite(
bestAsk
)
? (
bestBid +
bestAsk
) /
2
: (
Number.isFinite(
bestBid
)
? bestBid
: bestAsk
);

if(
!Number.isFinite(
mid
) ||
mid <=
0
){
return [];
}

const walls =
[];

function pushSide(
rows,
side
){

for(
const row of rows
){
const level =
levelNotional(
row
);

if(
!level ||
level.notional <
minNotional
){
continue;
}

walls.push({
side,
price:
level.price,
size:
level.size,
notional:
level.notional,
distancePct:
(
(
level.price -
mid
) /
mid
) *
100
});
}

}

pushSide(
bids,
"bid"
);
pushSide(
asks,
"ask"
);

walls.sort(
(
a,
b
)=>
b.notional -
a.notional
);

return walls.slice(
0,
DENSITY_WALLS_PER_BOOK
);

}

/**
 * @param {{
 *   getSymbols: () => string[],
 *   loadOrderbook: (symbol: string, depth: number) => Promise<{bids?: object[], asks?: object[]}>,
 *   onSnapshot?: (snapshot: { updatedAt: number, rows: object[] }) => void,
 *   intervalMs?: number,
 *   depth?: number,
 *   minNotional?: number,
 *   batch?: number
 * }} options
 */
export function startMarketDensitySnapshot(
options
){

let stopped =
false;
let running =
false;
let cursor =
0;
const bySymbol =
new Map();
const listeners =
new Set();

if(
typeof options.onSnapshot ===
"function"
){
listeners.add(
options.onSnapshot
);
}

function emit(){

const rows =
[];

for(
const [
symbol,
walls
] of bySymbol
){
for(
const wall of walls
){
rows.push({
symbol,
...wall
});
}
}

rows.sort(
(
a,
b
)=>
b.notional -
a.notional
);

const snapshot = {
updatedAt:
Date.now(),
rows
};

for(
const fn of listeners
){
fn(
snapshot
);
}

}

async function tick(){

if(
stopped ||
running
){
return;
}

running =
true;

try{
const symbols =
[
...new Set(
(
options.getSymbols?.() ||
[]
).map(
symbol=>
String(
symbol ||
""
).trim().toUpperCase()
).filter(
Boolean
)
)
];
const keep =
new Set(
symbols
);

for(
const key of [
...bySymbol.keys()
]
){
if(
!keep.has(
key
)
){
bySymbol.delete(
key
);
}
}

if(
!symbols.length
){
emit();
return;
}

const batch =
Math.max(
1,
options.batch ||
DENSITY_BATCH
);
const picked =
[];

for(
let i =
0;
i <
Math.min(
batch,
symbols.length
);
i +=
1
){
picked.push(
symbols[
(
cursor +
i
) %
symbols.length
]
);
}

cursor =
(
cursor +
picked.length
) %
symbols.length;

await Promise.all(
picked.map(
async symbol=>{

try{
const book =
await options.loadOrderbook(
symbol,
options.depth ||
DENSITY_BOOK_DEPTH
);

if(
stopped
){
return;
}

bySymbol.set(
symbol,
wallsFromBook(
book,
options.minNotional ||
DENSITY_MIN_NOTIONAL
)
);
}catch{
if(
!stopped
){
bySymbol.set(
symbol,
[]
);
}
}

}
)
);

if(
!stopped
){
emit();
}

}finally{
running =
false;
}

}

const timer =
setInterval(
()=>{
void tick();
},
options.intervalMs ||
DENSITY_SNAPSHOT_MS
);

void tick();

return {
stop(){
stopped =
true;
clearInterval(
timer
);
},
subscribe(
fn
){
listeners.add(
fn
);
return ()=>{
listeners.delete(
fn
);
};
}
};

}
