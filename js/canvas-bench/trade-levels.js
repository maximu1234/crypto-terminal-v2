/**
 * Уровни заявок и позиции на пробном холсте.
 * Цена уровня не зависит от тика последней свечи.
 */

export function sampleTradeLevels(
candles
){

const count =
candles?.length || 0;

if(count < 5){
return [];
}

let min = Infinity;
let max = -Infinity;
const from = Math.max(0, count - 40);

for(let i = from; i < count; i++){
min = Math.min(min, candles[i].low);
max = Math.max(max, candles[i].high);
}

const last = candles[count - 1].close;
const span = max - min || Math.abs(last) * 0.002 || 1;
const entry = last - span * 0.12;

return [
{
id: "entry",
kind: "entry",
side: "long",
price: entry,
label: "Long 0.02",
dash: false
},
{
id: "tp",
kind: "tp",
side: "long",
price: last + span * 0.28,
label: "TP",
dash: true
},
{
id: "sl",
kind: "sl",
side: "long",
price: entry - span * 0.22,
label: "SL",
dash: true
},
{
id: "buy",
kind: "order",
side: "long",
price: entry - span * 0.16,
label: "Buy 0.01",
dash: false
},
{
id: "sell",
kind: "order",
side: "short",
price: last + span * 0.16,
label: "Sell 0.01",
dash: false
}
];

}

export function hitTradeLevel(
level,
y,
pointerY,
threshold
){

return (
Number.isFinite(y) &&
Math.abs(pointerY - y) <= threshold
);

}
