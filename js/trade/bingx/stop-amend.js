/**
 * BingX renderer: pending SL/TP amend revisions.
 * Mirrors desktop/trading/bingx-position-stops.cjs accept rules (keep in sync).
 */

const pendingByKey =
new Map();

function normalizeStopSymbol(
symbol
){

return String(
symbol ||
""
)
.trim()
.toUpperCase()
.replace(
/-/g,
""
);

}

function normalizeStopPositionSide(
positionSide,
side
){

const raw =
String(
positionSide ||
""
)
.trim()
.toUpperCase();

if(
raw ===
"LONG" ||
raw ===
"SHORT" ||
raw ===
"BOTH"
){
return raw;
}

const s =
String(
side ||
""
)
.trim()
.toLowerCase();

if(
s ===
"buy" ||
s ===
"long"
){
return "LONG";
}

if(
s ===
"sell" ||
s ===
"short"
){
return "SHORT";
}

return "BOTH";

}

export function stopAmendKey(
symbol,
positionSide,
target,
side
){

const sym =
normalizeStopSymbol(
symbol
);
const posSide =
normalizeStopPositionSide(
positionSide,
side
);
const tgt =
String(
target ||
""
)
.toLowerCase() ===
"tp"
? "tp"
: "sl";

return `${sym}:${posSide}:${tgt}`;

}

export function stopPricesMatch(
a,
b
){

const x =
Number(
a
);
const y =
Number(
b
);

if(
!(
x >
0
) ||
!(
y >
0
) ||
!Number.isFinite(
x
) ||
!Number.isFinite(
y
)
){
return false;
}

const ref =
Math.max(
Math.abs(
x
),
Math.abs(
y
),
1e-8
);

return Math.abs(
x -
y
) /
ref <
1e-5;

}

function isStopAmendActive(
revision
){

if(
!revision
){
return false;
}

const phase =
String(
revision.phase ||
""
);

return (
phase ===
"requested" ||
phase ===
"clearing" ||
phase ===
"placed"
);

}

export function shouldAcceptIncomingStop(
target,
_prev,
next,
revision
){

if(
!isStopAmendActive(
revision
)
){
return {
accept:
true
};
}

const tgt =
String(
target ||
""
)
.toLowerCase() ===
"tp"
? "tp"
: "sl";
const priceKey =
tgt ===
"sl"
? "stopLoss"
: "takeProfit";
const idKey =
tgt ===
"sl"
? "slOrderId"
: "tpOrderId";
const incomingPrice =
Number(
next?.[priceKey]
) ||
0;
const incomingId =
String(
next?.[idKey] ||
""
)
.trim();
const newId =
String(
revision.newOrderId ||
""
)
.trim();
const wantPrice =
Number(
revision.price
) ||
0;

if(
newId &&
incomingId &&
incomingId ===
newId
){
return {
accept:
true,
confirmed:
true
};
}

if(
incomingPrice >
0 &&
wantPrice >
0 &&
stopPricesMatch(
incomingPrice,
wantPrice
)
){
return {
accept:
true,
confirmed:
Boolean(
newId
) ||
revision.phase ===
"placed"
};
}

return {
accept:
false
};

}

export function setPendingStopAmend(
input
){

const target =
String(
input?.target ||
""
)
.toLowerCase() ===
"tp"
? "tp"
: "sl";
const key =
input?.key ||
stopAmendKey(
input?.symbol,
input?.positionSide,
target,
input?.side
);
const revision =
{
id:
String(
input?.id ||
key
),
key,
symbol:
String(
input?.symbol ||
""
)
.trim(),
positionSide:
input?.positionSide ||
null,
side:
input?.side ||
null,
target,
price:
Number(
input?.price
) ||
0,
newOrderId:
input?.newOrderId
? String(
input.newOrderId
)
.trim()
: null,
phase:
String(
input?.phase ||
"requested"
),
at:
Date.now()
};

pendingByKey.set(
key,
revision
);

return revision;

}

export function getPendingStopAmend(
symbol,
positionSide,
target,
side
){

return pendingByKey.get(
stopAmendKey(
symbol,
positionSide,
target,
side
)
) ||
null;

}

export function getPendingStopAmendsForPosition(
position
){

if(
!position?.symbol
){
return {
sl:
null,
tp:
null
};
}

return {
sl:
getPendingStopAmend(
position.symbol,
position.positionSide,
"sl",
position.side
),
tp:
getPendingStopAmend(
position.symbol,
position.positionSide,
"tp",
position.side
)
};

}

export function clearPendingStopAmend(
symbol,
positionSide,
target,
side
){

pendingByKey.delete(
stopAmendKey(
symbol,
positionSide,
target,
side
)
);

}

export function clearPendingStopAmendByKey(
key
){

if(
key
){
pendingByKey.delete(
key
);
}

}

/**
 * Apply pending amend overlays / reject stale incoming stops.
 * @param {object|null|undefined} prev
 * @param {object} merged
 * @returns {object}
 */
export function gateCachedStopsWithPendingAmends(
prev,
merged
){

if(
!merged
){
return merged;
}

const revisions =
getPendingStopAmendsForPosition(
merged
);
let out =
{
...merged
};

for(
const target of [
"sl",
"tp"
]
){

const rev =
revisions[target];

if(
!rev
){
continue;
}

const decision =
shouldAcceptIncomingStop(
target,
prev,
out,
rev
);
const priceKey =
target ===
"sl"
? "stopLoss"
: "takeProfit";
const idKey =
target ===
"sl"
? "slOrderId"
: "tpOrderId";

if(
!decision.accept
){
out =
{
...out,
[priceKey]:
Number(
rev.price
) ||
Number(
prev?.[priceKey]
) ||
0
};

if(
rev.newOrderId
){
out[idKey] =
rev.newOrderId;
}

continue;
}

out =
{
...out,
[priceKey]:
Number(
rev.price
) ||
Number(
out[priceKey]
) ||
0
};

if(
rev.newOrderId
){
out[idKey] =
rev.newOrderId;
}

if(
decision.confirmed
){
clearPendingStopAmendByKey(
rev.key
);
}

}

return out;

}
