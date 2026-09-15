/**
 * Parallel Channel extra levels (Fib Channel–style ratios).
 * Default: rails 0 / 1 and median 0.5, all inheriting the channel color.
 */
import {
normalizeFibLevelColor
} from "./fib-spec.js?v=17";

export const CHANNEL_DEFAULT_COLOR =
"#ffa53e";

export const CHANNEL_TOOL_DEFAULTS_VERSION =
1;

export const CHANNEL_MIDLINE_RATIO =
0.5;

/** Fixed slots like TradingView Fib Channel; only 0 / 0.5 / 1 on by default. */
export const DEFAULT_CHANNEL_LEVEL_SPEC =
Object.freeze([
{ v: 0, enabled: true },
{ v: 0.236, enabled: false },
{ v: 0.382, enabled: false },
{ v: 0.5, enabled: true },
{ v: 0.618, enabled: false },
{ v: 0.786, enabled: false },
{ v: 1, enabled: true },
{ v: 1.618, enabled: false },
{ v: 2, enabled: false },
{ v: 2.414, enabled: false },
{ v: 2.618, enabled: false },
{ v: 3.618, enabled: false },
{ v: 4.236, enabled: false },
{ v: -0.236, enabled: false },
{ v: -0.618, enabled: false },
{ v: -1, enabled: false }
]);

function cloneLevelRow(
spec
){

const row =
{
v: spec.v,
enabled: !!spec.enabled
};

const color =
normalizeFibLevelColor(
spec.color
);

if(
color
){
row.color = color;
}

return row;

}

export function cloneDefaultChannelRows(){

return DEFAULT_CHANNEL_LEVEL_SPEC.map(
cloneLevelRow
);

}

export function isChannelMidlineRatio(
v
){

return (
Number.isFinite(
v
) &&
Math.abs(
v -
CHANNEL_MIDLINE_RATIO
) <
1e-6
);

}

export function finalizeChannelLevels(
raw
){

const next =
cloneDefaultChannelRows();

if(
!Array.isArray(
raw
)
){
return next;
}

raw.forEach(
(
cell,
i
)=>{

if(
i >=
next.length ||
!cell ||
typeof cell !==
"object"
){
return;
}

if(
typeof cell.v ===
"number" &&
Number.isFinite(
cell.v
)
){
next[
i
].v =
cell.v;
}

if(
typeof cell.enabled ===
"boolean"
){
next[
i
].enabled =
cell.enabled;
}

const levelColor =
normalizeFibLevelColor(
cell.color
);

if(
levelColor
){
next[
i
].color =
levelColor;
}else{
delete next[
i
].color;
}

}
);

return next;

}

export function ensureChannelLevelsVisible(
raw
){

const rows =
finalizeChannelLevels(
raw
);

if(
rows.some(
row=>
row.enabled
)
){
return rows;
}

return cloneDefaultChannelRows();

}

export function getChannelDrawRows(
shape
){

return ensureChannelLevelsVisible(
shape?.channelLevels
);

}

export function createChannelToolDefaults(
overrides =
{}
){

return {
channelDefaultsVersion:
CHANNEL_TOOL_DEFAULTS_VERSION,
color:
CHANNEL_DEFAULT_COLOR,
lineWidth:
1,
channelLevels:
cloneDefaultChannelRows(),
...overrides
};

}

export function migrateChannelToolDefaults(
saved
){

const base =
createChannelToolDefaults();

if(
!saved ||
typeof saved !==
"object"
){
return base;
}

const lineWidth =
Number(
saved.lineWidth
);

return {
...base,
color:
typeof saved.color ===
"string" &&
saved.color.trim()
? saved.color.trim()
: CHANNEL_DEFAULT_COLOR,
lineWidth:
Number.isFinite(
lineWidth
) &&
lineWidth >=
1
? Math.min(
4,
Math.round(
lineWidth
)
)
: 1,
channelLevels:
ensureChannelLevelsVisible(
saved.channelLevels
)
};

}

/**
 * t=0 → p1–p2 (first rail), t=1 → p3–p4 (parallel).
 * @param {{ p1: {x:number,y:number}, p2: {x:number,y:number}, p3: {x:number,y:number}, p4: {x:number,y:number} }} geom
 */
export function channelLevelSegment(
geom,
t
){

if(
!geom?.p1 ||
!geom.p2 ||
!geom.p3 ||
!geom.p4 ||
!Number.isFinite(
t
)
){
return null;
}

return {
start: {
x:
geom.p1.x +
t *
(geom.p3.x - geom.p1.x),
y:
geom.p1.y +
t *
(geom.p3.y - geom.p1.y)
},
end: {
x:
geom.p2.x +
t *
(geom.p4.x - geom.p2.x),
y:
geom.p2.y +
t *
(geom.p4.y - geom.p2.y)
}
};

}
