#!/usr/bin/env node
/**
 * CI: все ?v=N в js/html должны совпадать с js/asset-manifest.js.
 * Запуск: node scripts/check-asset-manifest.cjs
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);

const ROOT =
path.join(
__dirname,
".."
);
const MANIFEST =
path.join(
ROOT,
"js/asset-manifest.js"
);

function readAssets(){

const src =
fs.readFileSync(
MANIFEST,
"utf8"
);
const assets =
{};
const re =
/"([^"]+\.(?:js|css))"\s*:\s*(\d+)/g;
let m;

while(
(
m =
re.exec(
src
)
) !==
null
){
assets[
m[
1
]
] =
parseInt(
m[
2
],
10
);
}

return assets;

}

const SKIP_DIRS =
new Set([
"node_modules",
"vendor",
".git",
".venv-icons",
".venv",
"venv",
"dist"
]);

function walk(
dir,
out =
[]
){

let entries;

try{
entries =
fs.readdirSync(
dir
);
}catch{
return out;
}

for(
const name of
entries
){
if(
SKIP_DIRS.has(
name
)
){
continue;
}
const p =
path.join(
dir,
name
);
let st;

try{
st =
fs.lstatSync(
p
);
}catch(
err
){
if(
err?.code ===
"ENOENT"
){
continue;
}
throw err;
}

if(
st.isDirectory()
){
walk(
p,
out
);
}else if(
st.isFile() &&
/\.(js|html|css)$/.test(
name
)
){
out.push(
p
);
}
}

return out;

}

/** Manifest key for an import path relative to a source file (js/… or css/…). */
function resolveImportKey(
fromFile,
importPath
){

const clean =
importPath.split(
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

const abs =
path.normalize(
path.join(
path.dirname(
fromFile
),
clean
)
);

const rel =
path.relative(
ROOT,
abs
).replace(
/\\/g,
"/"
);

if(
rel.startsWith(
"js/"
)
){
return rel.slice(
3
);
}

if(
rel.startsWith(
"css/"
)
){
return rel.slice(
4
);
}

return null;

}

const assets =
readAssets();
const files =
walk(
ROOT
);
const versionRe =
/([a-zA-Z0-9_./-]+\.(?:js|css))\?v=(\d+)/g;
let mismatches =
0;

for(
const file of
files
){
if(
file.endsWith(
"asset-manifest.js"
)
){
continue;
}

const src =
fs.readFileSync(
file,
"utf8"
);
let m;

while(
(
m =
versionRe.exec(
src
)
) !==
null
){
const base =
resolveImportKey(
file,
m[
1
]
);
const found =
base
? assets[
base
]
: null;

if(
found ==
null
){
continue;
}

const v =
parseInt(
m[
2
],
10
);

if(
v !==
found
){
console.error(
`manifest mismatch: ${path.relative(ROOT, file)} → ${base}?v=${v} (manifest ${found})`
);
mismatches++;
}
}
}

if(
mismatches
){
console.error(
`\n${mismatches} mismatch(es). Run: node scripts/sync-asset-versions.cjs`
);
process.exit(
1
);

}

console.log(
`asset-manifest OK (${Object.keys(assets).length} assets, ${files.length} files scanned)`
);
