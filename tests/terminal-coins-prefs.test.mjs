import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const source =
fs.readFileSync(
path.join(
path.dirname(
fileURLToPath(
import.meta.url
)
),
"../js/terminal/terminal-prefs.js"
),
"utf8"
);

function exportedFn(
name
){

const start =
source.indexOf(
`export function ${name}`
);

assert.notEqual(
start,
-1,
`missing export function ${name}`
);

let next =
source.indexOf(
"export function",
start + 1
);

if(
next <
0
){
next =
source.length;
}

return source.slice(
start,
next
);

}

test("writeCoinsPrefs and readCoinsPrefs share one whitelist mapper", () => {

assert.match(
exportedFn(
"writeCoinsPrefs"
),
/JSON\.stringify\(\s*normalizeCoinsPrefs/
);
assert.match(
exportedFn(
"readCoinsPrefs"
),
/prefs =\s*normalizeCoinsPrefs\(\s*JSON\.parse/
);

});

test("normalizeCoinsPrefs writes every defaultCoinsPrefs field", () => {

const defaults =
exportedFn(
"defaultCoinsPrefs"
);
const mapper =
exportedFn(
"normalizeCoinsPrefs"
);
const keys =
[
"market",
"sortByMarket",
"lastViewByMarket",
"lastViewByExchange",
"invertChart",
"invertRsiChart",
"priceScaleMode",
"listRefreshMs"
];

for(
const key of
keys
){
assert.match(
defaults,
new RegExp(
`\\b${key}\\b`
),
`defaultCoinsPrefs must include ${key}`
);
assert.match(
mapper,
new RegExp(
`out\\.${key}\\b`
),
`normalizeCoinsPrefs must write out.${key}`
);
}

});
