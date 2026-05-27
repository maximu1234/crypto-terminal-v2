const LEGACY_TF_RE =
/^(.+)_(1|5|15|60|240|D)$/;

export function getShapeRevisionTime(
shape
){

if(
!shape ||
typeof shape !== "object"
){
return 0;
}

const updated =
Number(
shape.updatedAt
);

if(
Number.isFinite(updated) &&
updated >
0
){
return updated;
}

const created =
Number(
shape.createdAt
);

if(
Number.isFinite(created) &&
created >
0
){
return created;
}

const alertCreated =
Number(
shape.alertCreatedAt
);

if(
Number.isFinite(alertCreated) &&
alertCreated >
0
){
return alertCreated;
}

const id =
String(
shape.id ||
""
);

const match =
id.match(
/^d_(\d+)_/
);

if(
match
){
return Number(
match[
1
]
) ||
0;
}

return 0;

}

export function touchShapeRevision(
shape
){

if(
!shape ||
typeof shape !== "object"
){
return shape;
}

shape.updatedAt =
Date.now();

return shape;

}

function pickNewerShape(
a,
b
){

if(
!a
){
return b;
}

if(
!b
){
return a;
}

return getShapeRevisionTime(
a
) >=
getShapeRevisionTime(
b
)
? a
: b;

}

export function mergeShapeLists(
localList,
cloudList
){

const local =
Array.isArray(
localList
)
? localList
: [];

const cloud =
Array.isArray(
cloudList
)
? cloudList
: [];

const byId =
new Map();

for(
const shape of cloud
){

if(
shape?.id
){
byId.set(
String(
shape.id
),
shape
);
}

}

for(
const shape of local
){

if(
!shape?.id
){
continue;
}

const id =
String(
shape.id
);
const prev =
byId.get(
id
);

byId.set(
id,
pickNewerShape(
prev,
shape
)
);

}

return [
...byId.values()
];

}

export function mergeDrawingsMaps(
localMap,
cloudMap
){

const local =
localMap &&
typeof localMap ===
"object"
? localMap
: {};

const cloud =
cloudMap &&
typeof cloudMap ===
"object"
? cloudMap
: {};

const symbols =
new Set([
...Object.keys(
local
),
...Object.keys(
cloud
)
]);

const out =
{};

for(
const sym of symbols
){

const key =
String(
sym
).trim().toUpperCase();

if(
!key
){
continue;
}

out[
key
] =
mergeShapeLists(
local[
key
],
cloud[
key
]
);

}

return out;

}

export function collectAllLocalDrawings(){

const out =
{};

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const suffix =
key.slice(
"drawings_".length
);

if(
LEGACY_TF_RE.test(
suffix
)
){
continue;
}

try{

const list =
JSON.parse(
localStorage.getItem(
key
) ||
"[]"
);

if(
Array.isArray(
list
)
){
out[
suffix
] =
list;
}

}catch{
/* ignore */
}

}

return out;

}

export function applyDrawingsMapToLocal(
map,
opts = {}
){

if(
!map ||
typeof map !==
"object"
){
return;
}

const merge =
opts.merge !==
false;

const cloudSyms =
new Set(
Object.keys(
map
).map(
sym=>
String(
sym
).trim().toUpperCase()
).filter(
Boolean
)
);

if(
!merge
){

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const suffix =
key.slice(
"drawings_".length
);

if(
LEGACY_TF_RE.test(
suffix
) ||
cloudSyms.has(
suffix
)
){
continue;
}

localStorage.removeItem(
key
);

}

}else{

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const suffix =
key.slice(
"drawings_".length
);

if(
LEGACY_TF_RE.test(
suffix
)
){
continue;
}

if(
cloudSyms.has(
suffix
)
){
continue;
}

}

}

for(
const [
sym,
list
] of Object.entries(
map
)
){

const norm =
String(
sym
).trim().toUpperCase();

if(
!norm
){
continue;
}

const key =
`drawings_${norm}`;

if(
!Array.isArray(
list
) ||
list.length ===
0
){

if(
!merge
){
localStorage.removeItem(
key
);
}

continue;
}

let next =
list;

if(
merge
){

let localList =
[];

try{
localList =
JSON.parse(
localStorage.getItem(
key
) ||
"[]"
);
}catch{
localList =
[];
}

if(
!Array.isArray(
localList
)
){
localList =
[];
}

next =
mergeShapeLists(
localList,
list
);

}

localStorage.setItem(
key,
JSON.stringify(
next
)
);

}

}
