/** BingX diary period picker + date helpers. */
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

export function mountTradeDiaryPeriodPicker(
triggerEl,
{
onApply,
initialPeriod
}
){

if(
!triggerEl
){
return {
getPeriod(){
return getDefaultDiaryPeriod();
},
setPeriodLabel(){
/* noop */
}
};

}

let activePeriod =
initialPeriod ||
getDefaultDiaryPeriod();
let modalEl =
null;
let draft =
null;

const labelEl =
triggerEl.querySelector(
"[data-period-label]"
) ||
triggerEl;

function setTriggerLabel(
period
){

labelEl.textContent =
period?.label ||
"Период";

}

function closeModal(){

if(
!modalEl
){
return;
}

modalEl.remove();
modalEl =
null;
draft =
null;
document.removeEventListener(
"keydown",
onKeydown
);

}

function onKeydown(
event
){

if(
event.key ===
"Escape"
){
closeModal();
}

}

function syncDraftFromInputs(){

if(
!modalEl ||
!draft
){
return;
}

const startRaw =
modalEl.querySelector(
"[data-period-input='start']"
)?.value;
const endRaw =
modalEl.querySelector(
"[data-period-input='end']"
)?.value;
const startMs =
parseDiaryInputDate(
startRaw
);
const endMs =
parseDiaryInputDate(
endRaw
);

if(
startMs ==
null ||
endMs ==
null
){
return;
}

const range =
normalizeRange(
startMs,
endMs
);
draft.startMs =
range.startMs;
draft.endMs =
range.endMs;
draft.startKey =
dayKeyFromMs(
range.startMs
);
draft.endKey =
dayKeyFromMs(
range.endMs
);
draft.presetId =
null;
renderModalBody();

}

function renderMonth(
year,
month,
side
){

const cells =
buildMonthCells(
year,
month
);
const startKey =
draft.startKey;
const endKey =
draft.endKey;
const rangeStart =
startKey &&
endKey
? Math.min(
msFromDayKey(
startKey
),
msFromDayKey(
endKey
)
)
: null;
const rangeEnd =
startKey &&
endKey
? Math.max(
msFromDayKey(
startKey
),
msFromDayKey(
endKey
)
)
: null;

const weeks =
[];

for(
let i =
0;
i <
cells.length;
i +=
7
){
weeks.push(
cells.slice(
i,
i +
7
)
);
}

const dayHtml =
weeks.map(
row=>`
<div class="trade-diary-period-week">
${row.map(
cell=>{

if(
!cell
){
return `<span class="trade-diary-period-day is-empty" aria-hidden="true"></span>`;
}

const cellMs =
msFromDayKey(
cell.key
);
const inRange =
rangeStart !=
null &&
rangeEnd !=
null &&
cellMs >=
rangeStart &&
cellMs <=
rangeEnd;
const isStart =
cell.key ===
startKey;
const isEnd =
cell.key ===
endKey;
const weekend =
cell.day &&
(
new Date(
cell.year,
cell.month,
cell.day
).getDay() ===
0 ||
new Date(
cell.year,
cell.month,
cell.day
).getDay() ===
6
);

return `
<button type="button" class="trade-diary-period-day${inRange
? " is-in-range"
: ""}${isStart
? " is-start"
: ""}${isEnd
? " is-end"
: ""}${weekend
? " is-weekend"
: ""}" data-day-key="${escapeHtml(
cell.key
)}">${cell.day}</button>`;

}
).join(
""
)}
</div>`
).join(
""
);

return `
<div class="trade-diary-period-month" data-month-side="${side}">
<div class="trade-diary-period-month-head">
<button type="button" class="trade-diary-period-nav" data-nav="${side}:prev" aria-label="Предыдущий месяц">‹</button>
<span class="trade-diary-period-month-title">${MONTHS_RU_FULL[month]} ${year}</span>
<button type="button" class="trade-diary-period-nav" data-nav="${side}:next" aria-label="Следующий месяц">›</button>
</div>
<div class="trade-diary-period-weekdays">
${WEEKDAYS_RU.map(
(
wd,
idx
)=>`<span class="${idx >=
5
? "is-weekend"
: ""}">${wd}</span>`
).join(
""
)}
</div>
<div class="trade-diary-period-days">${dayHtml}</div>
</div>`;

}

function renderModalBody(){

if(
!modalEl ||
!draft
){
return;
}

const left =
{
year:
draft.leftYear,
month:
draft.leftMonth
};
const right =
monthShift(
draft.leftYear,
draft.leftMonth,
1
);

modalEl.querySelector(
"[data-period-presets]"
).innerHTML =
DIARY_PERIOD_PRESETS.map(
preset=>`
<button type="button" class="trade-diary-period-preset${draft.presetId ===
preset.id
? " active"
: ""}" data-preset="${preset.id}">${escapeHtml(
preset.label
)}</button>`
).join(
""
);

modalEl.querySelector(
"[data-period-calendars]"
).innerHTML =
renderMonth(
left.year,
left.month,
"left"
) +
renderMonth(
right.year,
right.month,
"right"
);

modalEl.querySelector(
"[data-period-input='start']"
).value =
formatDiaryInputDate(
draft.startMs
);
modalEl.querySelector(
"[data-period-input='end']"
).value =
formatDiaryInputDate(
draft.endMs
);

}

function openModal(){

closeModal();

const range =
normalizeRange(
activePeriod.startMs,
activePeriod.endMs
);
const startDate =
new Date(
range.startMs
);

draft =
{
startMs:
range.startMs,
endMs:
range.endMs,
startKey:
dayKeyFromMs(
range.startMs
),
endKey:
dayKeyFromMs(
range.endMs
),
presetId:
activePeriod.presetId ||
null,
leftYear:
startDate.getFullYear(),
leftMonth:
startDate.getMonth(),
pickAnchor:
null
};

modalEl =
document.createElement(
"div"
);
modalEl.className =
"trade-diary-period-overlay";
modalEl.innerHTML =
`
<div class="trade-diary-period-dialog" role="dialog" aria-modal="true" aria-labelledby="trade-diary-period-title">
<div class="trade-diary-period-dialog-head">
<h2 id="trade-diary-period-title">Выбор периода</h2>
<button type="button" class="trade-diary-period-close" data-action="close" aria-label="Закрыть">×</button>
</div>
<div class="trade-diary-period-presets" data-period-presets></div>
<div class="trade-diary-period-calendars" data-period-calendars></div>
<div class="trade-diary-period-inputs">
<input type="text" class="trade-diary-period-input" data-period-input="start" inputmode="numeric" autocomplete="off" spellcheck="false" aria-label="Дата начала"/>
<span class="trade-diary-period-input-sep">—</span>
<input type="text" class="trade-diary-period-input" data-period-input="end" inputmode="numeric" autocomplete="off" spellcheck="false" aria-label="Дата окончания"/>
</div>
<div class="trade-diary-period-actions">
<button type="button" class="trade-diary-period-btn-secondary" data-action="cancel">Отменить</button>
<button type="button" class="trade-diary-period-btn-primary" data-action="apply">Применить</button>
</div>
</div>`;

document.body.appendChild(
modalEl
);
renderModalBody();

modalEl.addEventListener(
"click",
event=>{

if(
event.target ===
modalEl
){
closeModal();
return;
}

const action =
event.target.closest(
"[data-action]"
)?.dataset.action;

if(
action ===
"close" ||
action ===
"cancel"
){
closeModal();
return;
}

if(
action ===
"apply"
){

const rangeNorm =
normalizeRange(
draft.startMs,
draft.endMs
);
const preset =
draft.presetId
? DIARY_PERIOD_PRESETS.find(
p=>
p.id ===
draft.presetId
)
: null;

activePeriod =
{
presetId:
draft.presetId,
label:
preset?.label ||
`${formatDiaryInputDate(
rangeNorm.startMs
)} — ${formatDiaryInputDate(
rangeNorm.endMs
)}`,
...rangeNorm
};

setTriggerLabel(
activePeriod
);
onApply?.(
activePeriod
);
closeModal();
return;

}

const presetId =
event.target.closest(
"[data-preset]"
)?.dataset.preset;

if(
presetId
){

const presetRange =
resolveDiaryPreset(
presetId
);
const rangeNorm =
normalizeRange(
presetRange.startMs,
presetRange.endMs
);
draft.presetId =
presetId;
draft.startMs =
rangeNorm.startMs;
draft.endMs =
rangeNorm.endMs;
draft.startKey =
dayKeyFromMs(
rangeNorm.startMs
);
draft.endKey =
dayKeyFromMs(
rangeNorm.endMs
);
const sd =
new Date(
rangeNorm.startMs
);
draft.leftYear =
sd.getFullYear();
draft.leftMonth =
sd.getMonth();
renderModalBody();
return;

}

const nav =
event.target.closest(
"[data-nav]"
)?.dataset.nav;

if(
nav
){

const delta =
nav.endsWith(
":prev"
)
? -1
: 1;
const next =
monthShift(
draft.leftYear,
draft.leftMonth,
delta
);
draft.leftYear =
next.year;
draft.leftMonth =
next.month;
renderModalBody();
return;

}

const dayKey =
event.target.closest(
"[data-day-key]"
)?.dataset.dayKey;

if(
dayKey
){

const dayMs =
msFromDayKey(
dayKey
);

if(
!draft.pickAnchor ||
(
draft.startKey &&
draft.endKey &&
draft.startKey !==
draft.endKey
)
){

draft.pickAnchor =
dayKey;
draft.startKey =
dayKey;
draft.endKey =
dayKey;
draft.startMs =
dayMs;
draft.endMs =
endOfDayMs(
dayMs
);
}else{

const anchorMs =
msFromDayKey(
draft.pickAnchor
);
const rangeNorm =
normalizeRange(
anchorMs,
dayMs
);
draft.startMs =
rangeNorm.startMs;
draft.endMs =
rangeNorm.endMs;
draft.startKey =
dayKeyFromMs(
rangeNorm.startMs
);
draft.endKey =
dayKeyFromMs(
rangeNorm.endMs
);
draft.pickAnchor =
null;
}

draft.presetId =
null;
renderModalBody();
}

}
);

modalEl.addEventListener(
"change",
event=>{

if(
event.target.matches(
"[data-period-input]"
)
){
syncDraftFromInputs();
}

}
);

document.addEventListener(
"keydown",
onKeydown
);

}

setTriggerLabel(
activePeriod
);

triggerEl.addEventListener(
"click",
()=>{
openModal();
}
);

return {
getPeriod(){
return {
...activePeriod
};
},
setPeriodLabel(
period
){
activePeriod =
period;
setTriggerLabel(
period
);
}
};

}
