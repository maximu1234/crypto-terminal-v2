/**
 * TP→EMA trail (как в Pattern 1-2 Chart Template).
 * При касании TP: если close по тренду от EMA — не закрывать,
 * ждать закрытие тела против EMA. Иначе закрыть по TP.
 */
export const DEFAULT_ALGO_TP_EMA_LENGTH =
50;

export const MIN_ALGO_TP_EMA_LENGTH =
1;

export const MAX_ALGO_TP_EMA_LENGTH =
500;

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function normalizeAlgoTpEmaTrail(
raw
){

return raw ===
true ||
raw ===
1 ||
raw ===
"1" ||
raw ===
"true";

}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampAlgoTpEmaLength(
raw
){

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
)
){
return DEFAULT_ALGO_TP_EMA_LENGTH;
}

return Math.min(
MAX_ALGO_TP_EMA_LENGTH,
Math.max(
MIN_ALGO_TP_EMA_LENGTH,
n
)
);

}

/**
 * Классическая EMA по close (SMA seed на первых length барах).
 * @param {Array<{ close?: number }>} candles
 * @param {number} length
 * @returns {number[]}
 */
export function computeAlgoCloseEmaSeries(
candles,
length
){

const len =
clampAlgoTpEmaLength(
length
);
const n =
Array.isArray(
candles
)
? candles.length
: 0;
const out =
new Array(
n
);

for(
let i =
0;
i <
n;
i++
){
out[
i
] =
NaN;
}

if(
n <
len ||
len <
1
){
return out;
}

let sum =
0;

for(
let i =
0;
i <
len;
i++
){

const c =
Number(
candles[
i
]?.close
);

if(
!Number.isFinite(
c
)
){
return out;
}

sum +=
c;

}

out[
len -
1
] =
sum /
len;
const mult =
2 /
(
len +
1
);

for(
let i =
len;
i <
n;
i++
){

const c =
Number(
candles[
i
]?.close
);

if(
!Number.isFinite(
c
) ||
!Number.isFinite(
out[
i -
1
]
)
){
out[
i
] =
NaN;
continue;
}

out[
i
] =
(
c -
out[
i -
1
]
) *
mult +
out[
i -
1
];

}

return out;

}

/**
 * Цена по тренду относительно EMA (не закрываем TP).
 * @param {"long"|"short"} side
 * @param {number} close
 * @param {number} emaVal
 */
export function isAlgoTpEmaFavorable(
side,
close,
emaVal
){

if(
!Number.isFinite(
close
) ||
!Number.isFinite(
emaVal
)
){
return false;
}

return side ===
"short"
? close <
emaVal
: close >
emaVal;

}

/**
 * Закрытие тела против EMA — выход из trail.
 * @param {"long"|"short"} side
 * @param {number} close
 * @param {number} emaVal
 */
export function isAlgoTpEmaAgainst(
side,
close,
emaVal
){

if(
!Number.isFinite(
close
) ||
!Number.isFinite(
emaVal
)
){
return false;
}

return side ===
"short"
? close >
emaVal
: close <
emaVal;

}
