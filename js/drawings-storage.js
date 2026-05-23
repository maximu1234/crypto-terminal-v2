const LEGACY_TF_RE =
/^(.+)_(1|5|15|60|240|D)$/;

export function collectAllLocalDrawings(){

const out = {};

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!key?.startsWith("drawings_")){
continue;
}

const suffix =
key.slice("drawings_".length);

if(LEGACY_TF_RE.test(suffix)){
continue;
}

try{

const list =
JSON.parse(
localStorage.getItem(key) || "[]"
);

if(Array.isArray(list)){
out[suffix] = list;
}

}catch{
/* ignore */
}

}

return out;

}

export function applyDrawingsMapToLocal(map){

if(!map || typeof map !== "object"){
return;
}

const cloudSyms =
new Set(
Object.keys(map)
);

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!key?.startsWith("drawings_")){
continue;
}

const suffix =
key.slice("drawings_".length);

if(
LEGACY_TF_RE.test(suffix) ||
cloudSyms.has(suffix)
){
continue;
}

localStorage.removeItem(key);

}

for(const [sym, list] of Object.entries(map)){

if(
typeof sym !== "string" ||
!sym
){
continue;
}

const key =
`drawings_${sym}`;

if(
!Array.isArray(list) ||
list.length === 0
){

localStorage.removeItem(key);
continue;
}

localStorage.setItem(
key,
JSON.stringify(list)
);

}

}
