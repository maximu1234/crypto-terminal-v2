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
"venv"
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
m[
1
].replace(
/^\.\//,
""
).replace(
/^js\//,
""
).replace(
/^css\//,
""
);
const found =
assets[
base
];

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
