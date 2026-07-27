/** Shared diary date/period math (exchange-agnostic). */
const MONTHS_RU_FULL =
Object.freeze([
"Январь",
"Февраль",
"Март",
"Апрель",
"Май",
"Июнь",
"Июль",
"Август",
"Сентябрь",
"Октябрь",
"Ноябрь",
"Декабрь"
]);

const WEEKDAYS_RU =
Object.freeze([
"Пн",
"Вт",
"Ср",
"Чт",
"Пт",
"Сб",
"Вс"
]);

export const DIARY_PERIOD_PRESETS =
Object.freeze([
{
id:
"today",
label:
"Сегодня"
},
{
id:
"yesterday",
label:
"Вчера"
},
{
id:
"current-week",
label:
"Текущ. неделя"
},
{
id:
"current-month",
label:
"Текущ. месяц"
},
{
id:
"current-quarter",
label:
"Текущ. квартал"
},
{
id:
"last-30",
label:
"Посл. 30 дней"
},
{
id:
"last-90",
label:
"Посл. 90 дней"
},
{
id:
"ytd",
label:
"С начала года"
}
]);

function escapeHtml(
raw
){

return String(
raw ||
""
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

export function startOfDayMs(
ms
){

const d =
new Date(
ms
);
d.setHours(
0,
0,
0,
0
);
return d.getTime();

}

export function endOfDayMs(
ms
){

const d =
new Date(
ms
);
d.setHours(
23,
59,
59,
999
);
return d.getTime();

}

export function dayKeyFromMs(
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

export function msFromDayKey(
key
){

const [
y,
m,
d
] =
String(
key ||
""
).split(
"-"
).map(
Number
);

if(
!y ||
!m ||
!d
){
return NaN;
}

return startOfDayMs(
new Date(
y,
m -
1,
d
).getTime()
);

}

export function resolveDiaryPreset(
presetId,
nowMs =
Date.now()
){

const now =
new Date(
nowMs
);

switch(
presetId
){

case "today":
return {
startMs:
startOfDayMs(
nowMs
),
endMs:
endOfDayMs(
nowMs
)
};

case "yesterday":{

const y =
new Date(
now
);
y.setDate(
y.getDate() -
1
);
const t =
y.getTime();
return {
startMs:
startOfDayMs(
t
),
endMs:
endOfDayMs(
t
)
};

}

case "current-week":{

const d =
new Date(
now
);
const dow =
d.getDay();
const toMon =
dow ===
0
? -6
: 1 -
dow;
const mon =
new Date(
d
);
mon.setDate(
d.getDate() +
toMon
);
const sun =
new Date(
mon
);
sun.setDate(
mon.getDate() +
6
);
return {
startMs:
startOfDayMs(
mon.getTime()
),
endMs:
endOfDayMs(
sun.getTime()
)
};

}

case "current-month":{

const start =
new Date(
now.getFullYear(),
now.getMonth(),
1
);
const end =
new Date(
now.getFullYear(),
now.getMonth() +
1,
0
);
return {
startMs:
startOfDayMs(
start.getTime()
),
endMs:
endOfDayMs(
end.getTime()
)
};

}

case "current-quarter":{

const q =
Math.floor(
now.getMonth() /
3
);
const start =
new Date(
now.getFullYear(),
q *
3,
1
);
const end =
new Date(
now.getFullYear(),
q *
3 +
3,
0
);
return {
startMs:
startOfDayMs(
start.getTime()
),
endMs:
endOfDayMs(
end.getTime()
)
};

}

case "last-30":{

const start =
new Date(
now
);
start.setDate(
start.getDate() -
29
);
return {
startMs:
startOfDayMs(
start.getTime()
),
endMs:
endOfDayMs(
nowMs
)
};

}

case "last-90":{

const start =
new Date(
now
);
start.setDate(
start.getDate() -
89
);
return {
startMs:
startOfDayMs(
start.getTime()
),
endMs:
endOfDayMs(
nowMs
)
};

}

case "ytd":{

const start =
new Date(
now.getFullYear(),
0,
1
);
return {
startMs:
startOfDayMs(
start.getTime()
),
endMs:
endOfDayMs(
nowMs
)
};

}

default:
return resolveDiaryPreset(
"current-month",
nowMs
);

}

}

export function getDefaultDiaryPeriod(){

const presetId =
"current-week";
const preset =
DIARY_PERIOD_PRESETS.find(
p=>
p.id ===
presetId
);
const range =
resolveDiaryPreset(
presetId
);

return {
presetId,
label:
preset?.label ||
"Период",
...range
};

}

export function formatDiaryInputDate(
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
return "";
}

const day =
String(
d.getDate()
).padStart(
2,
"0"
);
const m =
String(
d.getMonth() +
1
).padStart(
2,
"0"
);
const y =
d.getFullYear();

return `${day}.${m}.${y}`;

}

export function parseDiaryInputDate(
raw
){

const m =
String(
raw ||
""
).trim().match(
/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
);

if(
!m
){
return null;
}

const day =
Number(
m[
1
]
);
const month =
Number(
m[
2
]
) -
1;
const year =
Number(
m[
3
]
);
const d =
new Date(
year,
month,
day
);

if(
d.getFullYear() !==
year ||
d.getMonth() !==
month ||
d.getDate() !==
day
){
return null;
}

return startOfDayMs(
d.getTime()
);

}

function normalizeRange(
startMs,
endMs
){

let start =
startOfDayMs(
startMs
);
let end =
endOfDayMs(
endMs
);

if(
start >
end
){
[
start,
end
] = [
end,
start
];
}

end =
endOfDayMs(
startOfDayMs(
end
)
);

return {
startMs:
start,
endMs:
end
};

}

function monthShift(
year,
month,
delta
){

const d =
new Date(
year,
month +
delta,
1
);
return {
year:
d.getFullYear(),
month:
d.getMonth()
};

}

function buildMonthCells(
year,
month
){

const firstDow =
new Date(
year,
month,
1
).getDay();
const lead =
firstDow ===
0
? 6
: firstDow -
1;
const daysInMonth =
new Date(
year,
month +
1,
0
).getDate();
const cells =
[];

for(
let i =
0;
i <
lead;
i++
){
cells.push(
null
);
}

for(
let day =
1;
day <=
daysInMonth;
day++
){
cells.push(
{
year,
month,
day,
key:
`${year}-${String(
month +
1
).padStart(
2,
"0"
)}-${String(
day
).padStart(
2,
"0"
)}`
}
);
}

while(
cells.length %
7 !==
0
){
cells.push(
null
);
}

return cells;

}
