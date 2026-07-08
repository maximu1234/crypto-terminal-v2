/**
 * Состояние страницы Скрипт (фильтр + авто-настройки).
 */
import {
loadPatternScanResults,
savePatternScanResults
} from "./pattern-scan-results.js?v=1";

import {
PATTERN_SCAN_DEPTH_OPTIONS
} from "./pattern-12-scanner.js?v=15";

export const SCRIPT_PAGE_STORAGE_KEY =
"script_page_pattern_scan_v1";

export const SCRIPT_AUTO_PERIODS =
[
{
id:
"15m",
label:
"15 мин",
ms:
15 *
60 *
1000
},
{
id:
"1h",
label:
"1 час",
ms:
60 *
60 *
1000
},
{
id:
"6h",
label:
"6 часов",
ms:
6 *
60 *
60 *
1000
},
{
id:
"24h",
label:
"24 часа",
ms:
24 *
60 *
60 *
1000
}
];

const DEFAULT_STATE =
{
filterTf:
"all",
searchDepth:
30,
sideFilter:
"both",
layout:
9,
page:
1,
auto:
{
active:
false,
tf:
"15",
periodId:
"1h",
nextRunAt:
0,
lastScanAt:
0
},
lastVisitedAt:
0
};

export function loadScriptPageState(){

try{
const raw =
JSON.parse(
localStorage.getItem(
SCRIPT_PAGE_STORAGE_KEY
) ||
"null"
);

if(
!raw ||
typeof raw !==
"object"
){
return {
...structuredClone(
DEFAULT_STATE
),
rows:
loadPatternScanResults()
};
}

const legacyRows =
Array.isArray(
raw.rows
)
? raw.rows
: [];
const scanRows =
loadPatternScanResults();
const rows =
scanRows.length
? scanRows
: legacyRows;

if(
!scanRows.length &&
legacyRows.length
){
savePatternScanResults(
legacyRows
);
}

return {
filterTf:
String(
raw.filterTf ||
DEFAULT_STATE.filterTf
),
searchDepth:
PATTERN_SCAN_DEPTH_OPTIONS.includes(
Number(
raw.searchDepth
)
)
? Number(
raw.searchDepth
)
: DEFAULT_STATE.searchDepth,
sideFilter:
(
raw.sideFilter === "long" ||
raw.sideFilter === "short" ||
raw.sideFilter === "both"
)
? raw.sideFilter
: DEFAULT_STATE.sideFilter,
layout:
[
4,
6,
9
].includes(
Number(
raw.layout
)
)
? Number(
raw.layout
)
: DEFAULT_STATE.layout,
page:
Math.max(
1,
Number(
raw.page
) ||
DEFAULT_STATE.page
),
rows,
auto:
{
active:
raw.auto?.active ===
true,
tf:
String(
raw.auto?.tf ||
DEFAULT_STATE.auto.tf
),
periodId:
SCRIPT_AUTO_PERIODS.some(
p=>
p.id ===
raw.auto?.periodId
)
? raw.auto.periodId
: DEFAULT_STATE.auto.periodId,
nextRunAt:
Number(
raw.auto?.nextRunAt
) ||
0,
lastScanAt:
Number(
raw.auto?.lastScanAt
) ||
0
},
lastVisitedAt:
Number(
raw.lastVisitedAt
) ||
0
};

}catch{
return {
...structuredClone(
DEFAULT_STATE
),
rows:
loadPatternScanResults()
};
}

}

export function saveScriptPageState(
state
){

try{
savePatternScanResults(
state.rows
);
localStorage.setItem(
SCRIPT_PAGE_STORAGE_KEY,
JSON.stringify(
{
filterTf:
state.filterTf,
searchDepth:
state.searchDepth,
sideFilter:
state.sideFilter,
layout:
state.layout,
page:
state.page,
auto:
state.auto,
lastVisitedAt:
state.lastVisitedAt
}
)
);
}catch{
/* ignore */
}

}

export function periodMsById(
periodId
){

return (
SCRIPT_AUTO_PERIODS.find(
p=>
p.id ===
periodId
)?.ms ||
SCRIPT_AUTO_PERIODS[
1
].ms
);

}
