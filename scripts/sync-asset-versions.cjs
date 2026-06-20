#!/usr/bin/env node
/**
 * Синхронизирует ?v=N во всех js/html с js/asset-manifest.js (ASSETS).
 *
 *   node scripts/sync-asset-versions.cjs              # sync all
 *   node scripts/sync-asset-versions.cjs bump chart.js  # +1 в manifest и sync
 *   node scripts/sync-asset-versions.cjs list         # показать реестр
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
const MANIFEST_PATH =
path.join(
ROOT,
"js/asset-manifest.js"
);

function readManifestAssets(){

const src =
fs.readFileSync(
MANIFEST_PATH,
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

if(
Object.keys(
assets
).length <
10
){
console.error(
"asset-manifest.js: не удалось распарсить ASSETS"
);
process.exit(
1
);
}

return assets;

}

function writeManifestAssets(
assets
){

let src =
fs.readFileSync(
MANIFEST_PATH,
"utf8"
);

for(
const [
name,
ver
] of
Object.entries(
assets
)
){

const lineRe =
new RegExp(
`("${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*)\\d+`
);

if(
!lineRe.test(
src
)
){
console.warn(
`manifest: нет ключа "${name}" — добавьте вручную в asset-manifest.js`
);
continue;
}

src =
src.replace(
lineRe,
`$1${ver}`
);
}

fs.writeFileSync(
MANIFEST_PATH,
src
);

}

function collectFiles(){

const out =
[];

function walk(
dir
){

if(
!fs.existsSync(
dir
)
){
return;
}

for(
const ent of
fs.readdirSync(
dir,
{ withFileTypes:true }
)
){

const p =
path.join(
dir,
ent.name
);

if(
ent.isDirectory()
){

if(
[
"node_modules",
"vendor",
".git",
"alert-worker"
].includes(
ent.name
)
){
continue;
}

walk(
p
);

}else if(
ent.isFile() &&
(
ent.name.endsWith(
".js"
) ||
ent.name.endsWith(
".html"
) ||
ent.name.endsWith(
".md"
)
)
){

out.push(
p
);

}

}

}

walk(
path.join(
ROOT,
"js"
)
);

for(
const name of
[
"index.html",
"coins.html",
"trade.html",
"terminal.html",
"listings.html",
"trade-calculator.html",
"statistics.html",
"alerts/index.html",
"system/index.html"
]
){

const p =
path.join(
ROOT,
name
);

if(
fs.existsSync(
p
)
){
out.push(
p
);

}

}

return out;

}

function syncFile(
filePath,
assets
){

let content =
fs.readFileSync(
filePath,
"utf8"
);

let changed =
false;

for(
const [
name,
ver
] of
Object.entries(
assets
).sort(
(
a,
b
)=>
b[
0
].length -
a[
0
].length
)
){

const escaped =
name.replace(
/[.*+?^${}()|[\]\\]/g,
"\\$&"
);

const re =
new RegExp(
`(?<![a-zA-Z0-9.-])${escaped}\\?v=\\d+`,
"g"
);

const next =
content.replace(
re,
`${name}?v=${ver}`
);

if(
next !==
content
){

content =
next;
changed =
true;

}

}

if(
changed
){

fs.writeFileSync(
filePath,
content
);

}

return changed;

}

function bumpAsset(
name
){

const assets =
readManifestAssets();

if(
assets[
name
] ==
null
){

console.error(
`Unknown asset: ${name}`
);
process.exit(
1
);
}

assets[
name
] +=
1;

writeManifestAssets(
assets
);

console.log(
`Bumped ${name} → v=${assets[name]}`
);

return assets;

}

function main(){

const args =
process.argv.slice(
2
);

if(
args[
0
] ===
"list"
){

const assets =
readManifestAssets();

for(
const [
k,
v
] of
Object.entries(
assets
).sort(
(
a,
b
)=>
a[
0
].localeCompare(
b[
0
]
)
)
){

console.log(
`${k}\tv=${v}`
);

}

return;

}

let assets;

if(
args[
0
] ===
"bump"
){

if(
!args[
1
]
){

console.error(
"Usage: sync-asset-versions.cjs bump <file.js|file.css>"
);
process.exit(
1
);
}

assets =
bumpAsset(
args[
1
]
);

}else{

assets =
readManifestAssets();

}

const files =
collectFiles();

let count =
0;

for(
const file of
files
){

if(
syncFile(
file,
assets
)
){

console.log(
"updated:",
path.relative(
ROOT,
file
)
);
count++;

}

}

console.log(
`Sync done: ${count} file(s), ${Object.keys(assets).length} assets in manifest`
);

}

main();
