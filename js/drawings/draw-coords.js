/**
 * Exact drawing coordinates (price + bar), TradingView Coordinates tab.
 * Brush / Elliott / text / FVP are not coordinate tools.
 */
import {
candleIndexAtOrBefore,
tfPeriodSec
} from "./chart-ruler.js?v=8";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=11";

import {
priceDecimalPlaces
} from "../format-price.js?v=2";

const TWO_POINT_TYPES = Object.freeze([
"trendline",
"arrow",
"fib",
"rectangle"
]);

export const COORD_TOOL_TYPES = Object.freeze([
...TWO_POINT_TYPES,
"hline",
"hray",
"channel",
"fib-ext",
"long",
"short"
]);

export function hasCoordSettings(
type
){

return COORD_TOOL_TYPES.includes(
type
);

}

export function coordFieldsForType(
type
){

if(
type ===
"hline"
){
return [
{
id: "anchor",
label: "#1 (price)",
price: true,
bar: false
}
];
}

if(
type ===
"hray"
){
return [
{
id: "anchor",
label: "#1 (price, bar)",
price: true,
bar: true
}
];
}

if(
TWO_POINT_TYPES.includes(
type
)
){
return [
{
id: "p1",
label: "#1 (price, bar)",
price: true,
bar: true
},
{
id: "p2",
label: "#2 (price, bar)",
price: true,
bar: true
}
];
}

if(
type ===
"channel" ||
type ===
"fib-ext"
){
return [
{
id: "p1",
label: "#1 (price, bar)",
price: true,
bar: true
},
{
id: "p2",
label: "#2 (price, bar)",
price: true,
bar: true
},
{
id: "p3",
label: "#3 (price, bar)",
price: true,
bar: true
}
];
}

if(
isPositionType(
type
)
){
return [
{
id: "entry",
label: "#1 (price, bar)",
price: true,
bar: true
},
{
id: "right",
label: "#2 (bar)",
price: false,
bar: true
},
{
id: "tp",
label: "Take profit (price)",
price: true,
bar: false
},
{
id: "sl",
label: "Stop (price)",
price: true,
bar: false
}
];
}

return [];

}

export function inferCandlePeriod(
candles,
tf
){

if(
candles?.length >=
2
){

const a =
Number(
candles[
candles.length -
1
].time
);
const b =
Number(
candles[
candles.length -
2
].time
);
const dt =
Math.abs(
a -
b
);

if(
dt >
0
){
return dt;
}

}

return tfPeriodSec(
tf
);

}

export function barIndexFromTime(
candles,
time,
tf
){

if(
!candles?.length
){
return 0;
}

const t =
Number(
time
);

if(
!Number.isFinite(
t
)
){
return 0;
}

const first =
Number(
candles[
0
].time
);
const last =
Number(
candles[
candles.length -
1
].time
);
const period =
inferCandlePeriod(
candles,
tf
);

if(
t <
first
){

if(
period >
0
){
return Math.round(
(t - first) /
period
);
}

return 0;

}

if(
t >
last
){

if(
period >
0
){
return candles.length -
1 +
Math.round(
(t - last) /
period
);
}

return candles.length -
1;

}

return candleIndexAtOrBefore(
candles,
t
);

}

export function timeFromBarIndex(
candles,
bar,
tf
){

if(
!candles?.length
){
return null;
}

const i =
Math.round(
Number(
bar
)
);

if(
!Number.isFinite(
i
)
){
return null;
}

if(
i >=
0 &&
i <
candles.length
){
return candles[
i
].time;
}

const period =
inferCandlePeriod(
candles,
tf
);

if(
!(
period >
0
)
){

return i <
0
? candles[
0
].time
: candles[
candles.length -
1
].time;

}

if(
i <
0
){
return candles[
0
].time +
i *
period;
}

return candles[
candles.length -
1
].time +
(
i -
(
candles.length -
1
)
) *
period;

}

export function parseCoordNumber(
raw
){

if(
typeof raw ===
"number"
){
return Number.isFinite(
raw
)
? raw
: NaN;
}

const text =
String(
raw ??
""
).trim().replace(
/\s/g,
""
).replace(
",",
"."
);

if(
!text ||
text ===
"-" ||
text ===
"." ||
text ===
"-."
){
return NaN;
}

const n =
Number(
text
);

return Number.isFinite(
n
)
? n
: NaN;

}

export function parseCoordBar(
raw
){

const n =
parseCoordNumber(
raw
);

if(
!Number.isFinite(
n
)
){
return NaN;
}

return Math.round(
n
);

}

export function formatCoordPrice(
price
){

if(
!Number.isFinite(
price
)
){
return "";
}

const decimals =
priceDecimalPlaces(
price
);

return String(
price.toFixed(
decimals
)
).replace(
(/(\.\d*?)0+$/),
"$1"
).replace(
/\.$/,
""
);

}

export function priceStepFor(
price
){

const decimals =
priceDecimalPlaces(
Number.isFinite(
price
)
? price
: 1
);

return 10 **
-decimals;

}

export function readShapeCoordPoint(
shape,
fieldId
){

if(
!shape
){
return null;
}

if(
fieldId ===
"p1" ||
fieldId ===
"p2" ||
fieldId ===
"p3"
){

const pt =
shape[
fieldId
];

if(
!pt
){
return null;
}

return {
time: pt.time,
price: pt.price
};

}

if(
fieldId ===
"anchor"
){
return {
time: shape.time,
price: shape.price
};
}

if(
fieldId ===
"entry"
){

if(
!shape.p1
){
return null;
}

return {
time: shape.p1.time,
price: positionEntryPrice(
shape
)
};

}

if(
fieldId ===
"right"
){

if(
!shape.p2
){
return null;
}

return {
time: shape.p2.time,
price: positionEntryPrice(
shape
)
};

}

if(
fieldId ===
"tp"
){
return {
time: shape.p1?.time,
price: shape.tpPrice
};
}

if(
fieldId ===
"sl"
){
return {
time: shape.p1?.time,
price: shape.slPrice
};
}

return null;

}

function assignPoint(
target,
patch
){

if(
!target ||
typeof target !==
"object"
){
return false;
}

if(
patch.price !=
null &&
Number.isFinite(
patch.price
)
){
target.price =
patch.price;
}

if(
patch.time !=
null &&
Number.isFinite(
Number(
patch.time
)
)
){
target.time =
patch.time;
}

return true;

}

export function writeShapeCoordPoint(
shape,
fieldId,
patch
){

if(
!shape ||
!patch
){
return false;
}

if(
fieldId ===
"p1" ||
fieldId ===
"p2" ||
fieldId ===
"p3"
){

if(
!shape[
fieldId
] ||
typeof shape[
fieldId
] !==
"object"
){
shape[
fieldId
] =
{};
}

return assignPoint(
shape[
fieldId
],
patch
);

}

if(
fieldId ===
"anchor"
){
return assignPoint(
shape,
patch
);
}

if(
fieldId ===
"entry"
){

if(
!shape.p1 ||
typeof shape.p1 !==
"object"
){
shape.p1 =
{};
}

const ok =
assignPoint(
shape.p1,
patch
);

if(
shape.p2 &&
typeof shape.p2 ===
"object" &&
patch.price !=
null &&
Number.isFinite(
patch.price
)
){
shape.p2.price =
patch.price;
}

return ok;

}

if(
fieldId ===
"right"
){

if(
!shape.p2 ||
typeof shape.p2 !==
"object"
){
shape.p2 =
{};
}

return assignPoint(
shape.p2,
{
time: patch.time
}
);

}

if(
fieldId ===
"tp"
){

if(
!Number.isFinite(
patch.price
)
){
return false;
}

shape.tpPrice =
patch.price;
return true;

}

if(
fieldId ===
"sl"
){

if(
!Number.isFinite(
patch.price
)
){
return false;
}

shape.slPrice =
patch.price;
return true;

}

return false;

}

function isValidPositionCoordPrice(
shape,
fieldId,
price
){

if(
!isPositionType(
shape.type
) ||
!Number.isFinite(
price
)
){
return false;
}

if(
fieldId ===
"entry"
){
return price >
0;
}

const entry =
positionEntryPrice(
shape
);

if(
!Number.isFinite(
entry
) ||
entry <=
0
){
return false;
}

if(
fieldId ===
"tp"
){
return shape.type ===
"long"
? price >
entry
: price <
entry;
}

if(
fieldId ===
"sl"
){
return shape.type ===
"long"
? price <
entry
: price >
entry;
}

return true;

}

export function applyCoordFieldToShape(
shape,
fieldId,
kind,
raw,
candles,
tf
){

if(
!shape ||
!hasCoordSettings(
shape.type
)
){
return false;
}

if(
kind ===
"price"
){

const price =
parseCoordNumber(
raw
);

if(
!Number.isFinite(
price
)
){
return false;
}

if(
isPositionType(
shape.type
) &&
(
fieldId ===
"entry" ||
fieldId ===
"tp" ||
fieldId ===
"sl"
) &&
!isValidPositionCoordPrice(
shape,
fieldId,
price
)
){
return false;
}

return writeShapeCoordPoint(
shape,
fieldId,
{
price
}
);

}

if(
kind ===
"bar"
){

const bar =
parseCoordBar(
raw
);

if(
!Number.isFinite(
bar
)
){
return false;
}

const time =
timeFromBarIndex(
candles,
bar,
tf
);

if(
time ==
null
){
return false;
}

return writeShapeCoordPoint(
shape,
fieldId,
{
time
}
);

}

return false;

}
