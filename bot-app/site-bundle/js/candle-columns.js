/**
 * Свечи одним Float64Array: time, open, high, low, close, volume.
 * Буфер можно отдать воркеру через transfer, не клонируя массив объектов.
 */
export const CANDLE_STRIDE =
6;

export function packCandles(
candles
){

const rows =
Array.isArray(
candles
)
? candles.length
: 0;
const data =
new Float64Array(
rows *
CANDLE_STRIDE
);

for(
let i =
0;
i <
rows;
i++
){

const row =
candles[
i
] ||
{};
const offset =
i *
CANDLE_STRIDE;

data[
offset
] =
Number(
row.time
) ||
0;
data[
offset +
1
] =
Number(
row.open
) ||
0;
data[
offset +
2
] =
Number(
row.high
) ||
0;
data[
offset +
3
] =
Number(
row.low
) ||
0;
data[
offset +
4
] =
Number(
row.close
) ||
0;
data[
offset +
5
] =
Number(
row.volume
) ||
0;

}

return data;

}

export function unpackCandles(
buffer,
rows
){

const count =
Math.max(
0,
Number(
rows
) ||
0
);
const data =
buffer instanceof Float64Array
? buffer
: new Float64Array(
buffer ||
0
);
const out =
new Array(
count
);

for(
let i =
0;
i <
count;
i++
){

const offset =
i *
CANDLE_STRIDE;

out[
i
] =
{
time:
data[
offset
] ||
0,
open:
data[
offset +
1
] ||
0,
high:
data[
offset +
2
] ||
0,
low:
data[
offset +
3
] ||
0,
close:
data[
offset +
4
] ||
0,
volume:
data[
offset +
5
] ||
0
};

}

return out;

}
