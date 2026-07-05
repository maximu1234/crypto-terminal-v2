/**
 * Сохранённые результаты скана паттерна 1-2 (без зависимостей).
 */
export const PATTERN_SCAN_RESULTS_KEY =
"pattern_12_scan_results_v1";

export function loadPatternScanResults(){

try{
const raw =
JSON.parse(
localStorage.getItem(
PATTERN_SCAN_RESULTS_KEY
) ||
"null"
);

if(
!raw ||
!Array.isArray(
raw.rows
)
){
return [];
}

return raw.rows.filter(
row=>
row &&
row.symbol &&
row.tf &&
row.side
);

}catch{
return [];
}

}

export function savePatternScanResults(
rows
){

try{
localStorage.setItem(
PATTERN_SCAN_RESULTS_KEY,
JSON.stringify(
{
updatedAt:
Date.now(),
rows:
Array.isArray(
rows
)
? rows
: []
}
)
);
}catch{
/* ignore */
}

}
