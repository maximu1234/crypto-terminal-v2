const GROUPS = ["red", "green", "gray", "blue"];
const GROUP_PREFIX_RE = /^(red|green|gray|blue):/;

export const TERMINAL_MAX_BLUE_FLAGS =
9;

const FLAG_SORT_ORDER_ASC = ["green", "gray", "blue", "red"];
const FLAG_SORT_ORDER_DESC = ["red", "blue", "gray", "green"];
const FLAG_CYCLE = [null, "red", "green", "gray", "blue"];

export function emptyFavorites(){

return {
red: [],
green: [],
gray: [],
blue: []
};

}

function normalizeGroup(g){

return GROUPS.includes(g) ? g : "red";

}

export function migrateFavorites(raw){

if(
raw &&
typeof raw === "object" &&
!Array.isArray(raw)
){

return {
red: Array.isArray(raw.red) ? raw.red.filter(s=>typeof s === "string") : [],
green: Array.isArray(raw.green) ? raw.green.filter(s=>typeof s === "string") : [],
gray: Array.isArray(raw.gray) ? raw.gray.filter(s=>typeof s === "string") : [],
blue: Array.isArray(raw.blue) ? raw.blue.filter(s=>typeof s === "string") : []
};

}

if(!Array.isArray(raw)){
return emptyFavorites();
}

const out = emptyFavorites();

raw.forEach(entry=>{

if(typeof entry !== "string" || !entry){
return;
}

const m =
entry.match(GROUP_PREFIX_RE);

if(m){

const sym =
entry.slice(m[0].length);

if(sym){
out[m[1]].push(sym);
}

return;
}

out.red.push(entry);

});

return out;

}

export function loadFavoritesGroups(){

try{

const raw =
JSON.parse(
localStorage.getItem("favorites") || "null"
);

return migrateFavorites(raw);

}catch{

return emptyFavorites();

}

}

export function saveFavoritesGroups(groups){

localStorage.setItem(
"favorites",
JSON.stringify(groups)
);

}

export function getFavoriteGroup(symbol, groups){

if(!symbol){
return null;
}

for(const g of GROUPS){

if(groups[g].includes(symbol)){
return g;
}

}

return null;

}

export function canSetBlueFlag(
symbol,
groups,
max = TERMINAL_MAX_BLUE_FLAGS
){

const sym =
String(
symbol || ""
).trim().toUpperCase();

if(
!sym
){
return false;
}

if(
groups.blue.includes(sym)
){
return true;
}

return (
groups.blue.length <
max
);

}

export function getTerminalBlueSymbols(
groups = loadFavoritesGroups()
){

return groups.blue.slice(
0,
TERMINAL_MAX_BLUE_FLAGS
);

}

export function setFavoriteGroup(symbol, group, groups){

if(!symbol){
return groups;
}

const sym =
String(symbol).trim().toUpperCase();

GROUPS.forEach(g=>{
groups[g] =
groups[g].filter(s=>s !== sym);
});

if(group){

const g =
normalizeGroup(group);

if(
g === "blue" &&
!canSetBlueFlag(
sym,
groups
)
){
return groups;
}

groups[g].push(sym);

}

return groups;

}

export function favoritesToCloudList(groups){

const list = [];

GROUPS.forEach(g=>{

groups[g].forEach(sym=>{

list.push(
g === "red"
? sym
: `${g}:${sym}`
);

});

});

return list;

}

export function favoritesFromCloudList(list){

return migrateFavorites(
Array.isArray(list) ? list : []
);

}

export function favoritesSignature(groups){

return GROUPS.map(g=>
`${g}:${[...groups[g]].sort().join(",")}`
).join("|");

}

export function favoritesGroupsEqual(a, b){

return favoritesSignature(a) ===
favoritesSignature(b);

}

export function flagSortRank(group, asc){

const order =
asc
? FLAG_SORT_ORDER_ASC
: FLAG_SORT_ORDER_DESC;

if(!group){
return order.length;
}

const idx =
order.indexOf(group);

return idx === -1
? order.length
: idx;

}

export function cycleFavoriteGroup(current){

const idx =
FLAG_CYCLE.indexOf(current ?? null);
const next =
(idx + 1) % FLAG_CYCLE.length;

return FLAG_CYCLE[next];

}

export const FLAG_TITLES = {
red: "Красный флаг",
green: "Зелёный флаг",
gray: "Серый флаг",
blue: "Синий флаг (Терминал)"
};
