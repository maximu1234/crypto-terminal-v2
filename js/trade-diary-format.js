const MONTHS_RU =
Object.freeze([
"янв",
"фев",
"мар",
"апр",
"май",
"июн",
"июл",
"авг",
"сен",
"окт",
"ноя",
"дек"
]);

export function formatDiaryTime(
ms
){

const d =
new Date(
ms
);

if(
Number.isNaN(
d.getTime()
)
){
return "—";
}

return d.toLocaleTimeString(
"ru-RU",
{
hour:
"2-digit",
minute:
"2-digit",
second:
"2-digit",
hour12:
false
}
);

}

export function formatDiaryDayLabel(
ms
){

const d =
new Date(
ms
);

if(
Number.isNaN(
d.getTime()
)
){
return "—";
}

return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;

}

export function formatDiaryWeekRange(
startMs,
endMs
){

const start =
new Date(
startMs
);
const end =
new Date(
endMs
);

if(
Number.isNaN(
start.getTime()
) ||
Number.isNaN(
end.getTime()
)
){
return "—";
}

const year =
String(
end.getFullYear()
).slice(
-2
);

if(
start.getMonth() ===
end.getMonth()
){
return `${start.getDate()} - ${end.getDate()} ${MONTHS_RU[end.getMonth()]} ${year}`;
}

return `${formatDiaryDayLabel(
startMs
)} - ${formatDiaryDayLabel(
endMs
)} ${year}`;

}

export function formatDiaryUsd(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return "—";
}

const abs =
Math.abs(
n
).toLocaleString(
"ru-RU",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
);

if(
n <
0
){
return `-$${abs}`;
}

return `$${abs}`;

}

export function formatDiaryPct(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return "—";
}

const abs =
Math.abs(
n
).toLocaleString(
"ru-RU",
{
minimumFractionDigits:
1,
maximumFractionDigits:
2
}
);

if(
n <
0
){
return `-${abs}%`;
}

return `${abs}%`;

}

export function formatDiaryDuration(
ms
){

const totalSec =
Math.max(
0,
Math.floor(
Number(
ms
) /
1000
)
);

if(
!Number.isFinite(
totalSec
)
){
return "—";
}

if(
totalSec <
1
){
return "1с";
}

if(
totalSec <
60
){
return `${totalSec}с`;
}

const totalMin =
Math.floor(
totalSec /
60
);

const sec =
totalSec %
60;

if(
totalMin <
60
){
return sec >
0
? `${totalMin}м ${sec}с`
: `${totalMin}м`;
}

const hours =
Math.floor(
totalMin /
60
);
const min =
totalMin %
60;

return min >
0
? `${hours}ч ${min}м`
: `${hours}ч`;

}

export function diaryDayKeyLocal(
ms
){

const d =
new Date(
ms
);

const y =
d.getFullYear();
const m =
String(
d.getMonth() +
1
).padStart(
2,
"0"
);
const day =
String(
d.getDate()
).padStart(
2,
"0"
);

return `${y}-${m}-${day}`;

}

export function pnlToneClass(
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
n ===
0
){
return "trade-diary-muted";
}

return n >
0
? "trade-diary-pos"
: "trade-diary-neg";

}

export function sideLabel(
side
){

return side ===
"long"
? "Long"
: "Short";

}

export function sideToneClass(
side
){

return side ===
"long"
? "trade-diary-pos"
: "trade-diary-neg";

}

export function formatDiaryUtcTime(
ms
){

const d =
new Date(
ms
);

if(
Number.isNaN(
d.getTime()
)
){
return "—";
}

return d.toLocaleTimeString(
"en-GB",
{
hour:
"2-digit",
minute:
"2-digit",
second:
"2-digit",
hour12:
false,
timeZone:
"UTC"
}
);

}

export function formatDiaryPrice(
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
return "—";
}

return `$${n.toLocaleString(
"en-US",
{
minimumFractionDigits:
2,
maximumFractionDigits:
8
}
)}`;

}

export function formatDiaryQty(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ){
return "—";
}

return n.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
8
}
);

}

export function formatDiaryFeePct(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ){
return "—";
}

return `${(
n *
100
).toLocaleString(
"ru-RU",
{
minimumFractionDigits:
1,
maximumFractionDigits:
2
}
)}%`;

}

export function executionSideLabel(
side
){

return String(
side ||
""
).toLowerCase() ===
"buy"
? "Покупка"
: "Продажа";

}

export function executionSideTone(
side
){

return String(
side ||
""
).toLowerCase() ===
"buy"
? "trade-diary-pos"
: "trade-diary-neg";

}
