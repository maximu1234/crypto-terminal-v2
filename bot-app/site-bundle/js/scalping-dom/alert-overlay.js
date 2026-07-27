/**
 * Alert underline on scalping DOM: dashed border under the row
 * just above the alert price (e.g. alert 100 → line between 100 and 99).
 */
import {
alertPriceForDisplay,
getActiveAlerts
} from "../alerts.js?v=105";

function normalizeSymbol(
raw
){

return String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
).replace(
/[^A-Z0-9]/g,
""
);

}

export function resolveAlertPrices(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return [];
}

const levels =
[];
const seen =
new Set();

try{
for(
const alert of
getActiveAlerts()
){
if(
normalizeSymbol(
alert?.symbol
) !==
sym
){
continue;
}

const level =
alertPriceForDisplay(
alert
);

if(
!Number.isFinite(
level
) ||
!(
level >
0
)
){
continue;
}

const key =
String(
level
);

if(
seen.has(
key
)
){
continue;
}

seen.add(
key
);
levels.push(
level
);
}
}catch{
return [];
}

return levels;

}

/**
 * Mark rows to underline (border under the level ≥ alert, above the next lower row).
 * Ladder is assumed high → low.
 */
export function applyAlertUnderlines(
ladder,
alertPrices
){

if(
!ladder?.rows?.length ||
!alertPrices?.length
){
return ladder;
}

const underlineAt =
new Set();
const rows =
ladder.rows;

for(
const level of
alertPrices
){

for(
let i =
0;
i <
rows.length;
i++
){
const price =
rows[
i
].price;
const next =
rows[
i +
1
];
const nextPrice =
next
? next.price
: -
Infinity;

/* Between this row and the next lower one. */
if(
price >=
level &&
nextPrice <
level
){
underlineAt.add(
i
);
break;
}

}

}

return {
...ladder,
rows:
rows.map(
(
row,
i
)=>
({
...row,
alertUnderline:
underlineAt.has(
i
)
})
)
};

}
