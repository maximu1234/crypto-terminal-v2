const GROUPS = ["red", "green", "gray"];
const GROUP_PREFIX_RE = /^(red|green|gray):/;

export function emptyFavorites(){

return { red: [], green: [], gray: [] };

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
gray: Array.isArray(raw.gray) ? raw.gray.filter(s=>typeof s === "string") : []
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

export function setFavoriteGroup(symbol, group, groups){

if(!symbol){
return groups;
}

GROUPS.forEach(g=>{
groups[g] =
groups[g].filter(s=>s !== symbol);
});

if(group){
const g =
normalizeGroup(group);
groups[g].push(symbol);
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
