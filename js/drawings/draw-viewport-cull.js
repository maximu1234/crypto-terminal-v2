/**
 * Фигура целиком за видимым окном — её не обводим.
 * Нет границ или неизвестный тип — рисуем, чтобы ничего не пропало.
 */
function isHorizPriceTool(
type
){

return type ===
"hline" ||
type ===
"hray";

}

function finite(
value
){

const n =
Number(
value
);

return Number.isFinite(
n
)
? n
: null;

}

function pushPoint(
times,
prices,
point
){

if(
!point
){
return;
}

const time =
finite(
point.time
);
const price =
finite(
point.price
);

if(
time !=
null
){
times.push(
time
);
}

if(
price !=
null
){
prices.push(
price
);
}

}

function shapeDataBox(
shape
){

const times =
[];
const prices =
[];

pushPoint(
times,
prices,
shape.p1
);
pushPoint(
times,
prices,
shape.p2
);
pushPoint(
times,
prices,
shape.p3
);
pushPoint(
times,
prices,
shape.p4
);
pushPoint(
times,
prices,
shape.p5
);
pushPoint(
times,
prices,
{
time:
shape.time,
price:
shape.price
}
);

for(
const key of [
"entryPrice",
"tpPrice",
"slPrice"
]
){

const price =
finite(
shape[
key
]
);

if(
price !=
null
){
prices.push(
price
);
}

}

const lists =
[
shape.path,
shape.points
];

for(
const list of lists
){

if(
!Array.isArray(
list
)
){
continue;
}

for(
const point of list
){
pushPoint(
times,
prices,
point
);
}

}

if(
isHorizPriceTool(
shape.type
)
){

const price =
finite(
shape.price
) ??
(
prices.length
? prices[
0
]
: null
);
const anchor =
finite(
shape.time
) ??
(
times.length
? Math.min(
...times
)
: null
);

if(
price ==
null
){
return null;
}

if(
shape.type ===
"hline"
){
return {
timeFrom:
null,
timeTo:
null,
priceFrom:
price,
priceTo:
price
};
}

if(
anchor ==
null
){
return null;
}

return {
timeFrom:
anchor,
timeTo:
null,
priceFrom:
price,
priceTo:
price
};

}

if(
!times.length &&
!prices.length
){
return null;
}

return {
timeFrom:
times.length
? Math.min(
...times
)
: null,
timeTo:
times.length
? Math.max(
...times
)
: null,
priceFrom:
prices.length
? Math.min(
...prices
)
: null,
priceTo:
prices.length
? Math.max(
...prices
)
: null
};

}

export function shapeMissesViewport(
shape,
view
){

if(
!shape ||
!view
){
return false;
}

const box =
shapeDataBox(
shape
);

if(
!box
){
return false;
}

const timeFrom =
finite(
view.timeFrom
);
const timeTo =
finite(
view.timeTo
);

if(
timeFrom !=
null &&
timeTo !=
null &&
timeTo >
timeFrom &&
box.timeFrom !=
null
){

const pad =
(timeTo -
timeFrom) *
0.02;
const left =
timeFrom -
pad;
const right =
timeTo +
pad;
const boxRight =
box.timeTo ==
null
? Number.POSITIVE_INFINITY
: box.timeTo;

if(
boxRight <
left ||
box.timeFrom >
right
){
return true;
}

}

const priceFrom =
finite(
view.priceFrom
);
const priceTo =
finite(
view.priceTo
);

if(
priceFrom !=
null &&
priceTo !=
null &&
box.priceFrom !=
null &&
box.priceTo !=
null
){

const low =
Math.min(
priceFrom,
priceTo
);
const high =
Math.max(
priceFrom,
priceTo
);
const span =
Math.max(
high -
low,
Math.abs(
high
) *
0.001,
1e-12
);
const pad =
span *
0.02;

if(
box.priceTo <
low -
pad ||
box.priceFrom >
high +
pad
){
return true;
}

}

return false;

}

/**
 * Якорь фигуры уже на плоте (с запасом).
 * Отсев по времени шкалы иногда врёт: пустое место справа и логический
 * диапазон шире реальных баров, а timeToCoordinate фигуру всё равно рисует.
 * Такую фигуру нельзя пропускать — иначе она видна только под курсором.
 */
export function shapeProjectsOnPlot(
shape,
toXY,
plotW,
plotH,
margin =
24
){

if(
!shape ||
typeof toXY !==
"function" ||
!(
plotW >
0
) ||
!(
plotH >
0
)
){
return false;
}

const pts =
[];

for(
const key of [
"p1",
"p2",
"p3",
"p4",
"p5"
]
){

if(
shape[
key
]
){
pts.push(
shape[
key
]
);
}

}

if(
shape.time !=
null ||
shape.price !=
null
){
pts.push({
time:
shape.time,
price:
shape.price
});
}

for(
const list of [
shape.path,
shape.points
]
){

if(
!Array.isArray(
list
)
){
continue;
}

for(
const point of list
){

if(
point
){
pts.push(
point
);
}

}

}

if(
shape.p1 &&
shape.tpPrice !=
null
){
pts.push({
time:
shape.p1.time,
price:
shape.tpPrice
});
}

if(
shape.p1 &&
shape.slPrice !=
null
){
pts.push({
time:
shape.p1.time,
price:
shape.slPrice
});
}

const left =
-margin;
const right =
plotW +
margin;
const top =
-margin;
const bottom =
plotH +
margin;

for(
const point of pts
){

let xy =
null;

try{
xy =
toXY(
point
);
}catch{
xy =
null;
}

if(
!xy ||
!Number.isFinite(
xy.x
) ||
!Number.isFinite(
xy.y
)
){
continue;
}

if(
xy.x >=
left &&
xy.x <=
right &&
xy.y >=
top &&
xy.y <=
bottom
){
return true;
}

}

return false;

}
