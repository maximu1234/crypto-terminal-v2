/**
 * Cache-bust tokens from file contents.
 *
 * The token is a short sha256 of the file with `?v=` queries stripped, plus
 * the tokens of the modules it imports. asset-manifest.js is hashed from
 * that table, then files that import the manifest are hashed again so their
 * URL changes when any module changes. The manifest token stays the hash of
 * the first table, so the step does not chase itself.
 */
const crypto =
require(
"crypto"
);
const path =
require(
"path"
);

const MANIFEST_KEY =
"asset-manifest.js";

const VERSION_RE =
/([a-zA-Z0-9_./-]+\.(?:js|css))\?v=[0-9a-f]+/gi;

function shortHash(
text
){

return crypto.createHash(
"sha256"
).update(
text
).digest(
"hex"
).slice(
0,
8
);

}

function stripVersions(
body
){

return String(
body ||
""
).replace(
/\?v=[0-9a-f]+/gi,
"?v="
);

}

function resolveDepKey(
fromKey,
importPath
){

const clean =
String(
importPath ||
""
).split(
"?"
)[
0
];

if(
clean.startsWith(
"/js/"
)
){
return clean.slice(
4
);
}

if(
clean.startsWith(
"/css/"
)
){
return clean.slice(
5
);
}

if(
!clean.startsWith(
"."
)
){
return clean;
}

const dir =
fromKey.includes(
"/"
)
? fromKey.replace(
/[^/]+$/,
""
)
: "";

return path.posix.normalize(
dir +
clean
);

}

function stronglyConnected(
keys,
depsOf
){

let index =
0;
const stack =
[];
const onStack =
new Set();
const indices =
new Map();
const low =
new Map();
const sccs =
[];

function strong(
v
){

indices.set(
v,
index
);
low.set(
v,
index
);
index +=
1;
stack.push(
v
);
onStack.add(
v
);

for(
const w of depsOf(
v
)
){

if(
!indices.has(
w
)
){
strong(
w
);
low.set(
v,
Math.min(
low.get(
v
),
low.get(
w
)
)
);
}else if(
onStack.has(
w
)
){
low.set(
v,
Math.min(
low.get(
v
),
indices.get(
w
)
)
);
}

}

if(
low.get(
v
) ===
indices.get(
v
)
){

const comp =
[];
let w;

do{
w =
stack.pop();
onStack.delete(
w
);
comp.push(
w
);
}while(
w !==
v
);

sccs.push(
comp
);

}

}

for(
const key of keys
){

if(
!indices.has(
key
)
){
strong(
key
);
}

}

return sccs;

}

function computeContentHashes(
entries
){

const stripped =
new Map();
const deps =
new Map();
const importsManifest =
new Set();
const known =
new Set();

for(
const entry of entries
){

if(
!entry ||
entry.key ===
MANIFEST_KEY
){
continue;
}

known.add(
entry.key
);
stripped.set(
entry.key,
stripVersions(
entry.body
)
);

}

for(
const entry of entries
){

if(
!known.has(
entry.key
)
){
continue;
}

const found =
[];
const seen =
new Set();

for(
const match of String(
entry.body ||
""
).matchAll(
VERSION_RE
)
){

const key =
resolveDepKey(
entry.key,
match[
1
]
);

if(
key ===
MANIFEST_KEY
){
importsManifest.add(
entry.key
);
continue;
}

if(
!known.has(
key
) ||
key ===
entry.key ||
seen.has(
key
)
){
continue;
}

seen.add(
key
);
found.push(
key
);

}

deps.set(
entry.key,
found
);

}

const keys =
[
...known
];

function depsOf(
key
){

return deps.get(
key
) ||
[];

}

const sccs =
stronglyConnected(
keys,
depsOf
);
const sccOf =
new Map();

for(
const scc of sccs
){

for(
const key of scc
){
sccOf.set(
key,
scc
);
}

}

function tokenFor(
key,
tokens,
manifestToken
){

const scc =
sccOf.get(
key
);
const sccSet =
new Set(
scc
);
const externals =
[];

for(
const member of scc
){

if(
manifestToken &&
importsManifest.has(
member
)
){
externals.push(
`${MANIFEST_KEY}=${manifestToken}`
);
}

for(
const dep of depsOf(
member
)
){

if(
sccSet.has(
dep
)
){
continue;
}

externals.push(
`${dep}=${tokens.get(dep)}`
);

}

}

externals.sort();

const sccStamp =
shortHash(
scc.map(
member=>
stripped.get(
member
)
).sort().join(
"\n"
)
);

return shortHash(
`${stripped.get(key)}\n${sccStamp}\n${externals.join("\n")}`
);

}

const tokens =
new Map();

for(
const scc of sccs
){

for(
const key of scc
){
tokens.set(
key,
tokenFor(
key,
tokens,
""
)
);
}

}

const manifestToken =
shortHash(
[...tokens.keys()].sort().map(
key=>
`${key}=${tokens.get(key)}`
).join(
"\n"
)
);

let guard =
keys.length +
2;
let changed =
true;

while(
changed &&
guard >
0
){

changed =
false;
guard -=
1;

for(
const scc of sccs
){

for(
const key of scc
){

const next =
tokenFor(
key,
tokens,
manifestToken
);

if(
tokens.get(
key
) !==
next
){
tokens.set(
key,
next
);
changed =
true;
}

}

}

}

if(
changed
){
throw new Error(
"asset content hash did not settle"
);
}

const out =
{};

for(
const [
key,
token
] of tokens
){
out[
key
] =
token;
}

out[
MANIFEST_KEY
] =
manifestToken;

return out;

}

module.exports =
{
computeContentHashes,
resolveDepKey,
shortHash,
stripVersions
};
