/**
 * Local L2 order book — snapshot + delta (size 0 = delete).
 */

function toPriceKey(
raw
){

return String(
raw ??
""
).trim();

}

function toSize(
raw
){

const n =
Number(
raw
);

return Number.isFinite(
n
)
? n
: 0;

}

function applySide(
map,
levels
){

if(
!Array.isArray(
levels
)
){
return;
}

for(
const row of
levels
){
const priceKey =
toPriceKey(
Array.isArray(
row
)
? row[
0
]
: row?.price
);
const size =
toSize(
Array.isArray(
row
)
? row[
1
]
: row?.size
);

if(
!priceKey
){
continue;
}

if(
size <=
0
){
map.delete(
priceKey
);
}else{
map.set(
priceKey,
size
);
}

}

}

function sideToRows(
map,
desc
){

const rows =
[];

for(
const [
priceKey,
size
] of
map
){
const price =
Number(
priceKey
);

if(
!Number.isFinite(
price
) ||
price <=
0 ||
!(
size >
0
)
){
continue;
}

rows.push(
{
price,
size,
notional:
price *
size
}
);

}

rows.sort(
(
a,
b
)=>
desc
? b.price -
a.price
: a.price -
b.price
);

return rows;

}

export function createLiveBook(){

const bids =
new Map();
const asks =
new Map();

let updateId =
0;
let ready =
false;

function clear(){

bids.clear();
asks.clear();
updateId =
0;
ready =
false;

}

function applySnapshot(
data
){

bids.clear();
asks.clear();
applySide(
bids,
data?.b ||
data?.bids
);
applySide(
asks,
data?.a ||
data?.asks
);
updateId =
Number(
data?.u
) ||
0;
ready =
bids.size >
0 ||
asks.size >
0;
return ready;

}

function applyDelta(
data
){

const u =
Number(
data?.u
);

/* Bybit: u=1 after snapshot means service restart — need fresh snapshot. */
if(
u ===
1 &&
ready
){
clear();
return "resync";
}

applySide(
bids,
data?.b ||
data?.bids
);
applySide(
asks,
data?.a ||
data?.asks
);

if(
Number.isFinite(
u
) &&
u >
0
){
updateId =
u;
}

ready =
bids.size >
0 ||
asks.size >
0;
return ready
? "ok"
: "empty";

}

/**
 * Full replace of both sides (BingX partial depth pushes).
 */
function replaceBook(
data
){

return applySnapshot(
data
);

}

function toBook(){

return {
bids:
sideToRows(
bids,
true
),
asks:
sideToRows(
asks,
false
),
updateId,
ready
};

}

return {
clear,
applySnapshot,
applyDelta,
replaceBook,
toBook,
isReady:()=>
ready
};

}
