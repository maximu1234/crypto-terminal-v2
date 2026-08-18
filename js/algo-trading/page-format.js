/**
 * Форматтеры UI АлгоТрейдинг.
 * Split from js/algo-trading.js — поведение 1:1.
 */
export function formatTurnover24Label(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return "";
}

let compact;

if(
n >=
1e6
){
compact =
`${Number((n / 1e6).toFixed(2))}M`;
}else if(
n >=
1e3
){
compact =
`${Number((n / 1e3).toFixed(2))}K`;
}else{
compact =
String(
Math.round(
n
)
);
}

return `Объем 24ч: ${compact}`;

}
