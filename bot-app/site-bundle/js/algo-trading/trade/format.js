/**
 * Algo trade number formatters (isolated copy).
 */

export function formatTradeUsdt(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
)
){
return "—";
}

return num.toLocaleString(
"ru-RU",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
);

}

export function formatTradePnl(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
)
){
return "—";
}

return num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2,
signDisplay:
"exceptZero"
}
);

}
