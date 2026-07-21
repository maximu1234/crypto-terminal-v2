/**
 * Build Mac or Windows desktop twice: edition f (full) and m (manual-only).
 * Artifacts land in desktop/dist/editions/ with the letter in the filename,
 * e.g. Multichart-1.0.74f-arm64.dmg next to Multichart-1.0.74m-arm64.dmg.
 *
 * Usage (from desktop/):
 *   node scripts/build-dual-editions.cjs mac
 *   node scripts/build-dual-editions.cjs win
 */
const {
spawnSync
} =
require(
"child_process"
);
const fs =
require(
"fs"
);
const path =
require(
"path"
);

const platform =
String(
process.argv[2] ||
""
).toLowerCase();

if(
platform !==
"mac" &&
platform !==
"win"
){
console.error(
"Usage: node scripts/build-dual-editions.cjs mac|win"
);
process.exit(
1
);
}

const desktopRoot =
path.join(
__dirname,
".."
);
const distDir =
path.join(
desktopRoot,
"dist"
);
const outDir =
path.join(
distDir,
"editions"
);
const editionFile =
path.join(
desktopRoot,
"algo-trading-edition.cjs"
);
const version =
require(
path.join(
desktopRoot,
"package.json"
)
).version;

const EDITIONS =
[
"f",
"m"
];

const EDITION_SOURCE_RE =
/const ALGO_DESKTOP_EDITION =\n"[fm]";/;

function ensureDir(
dir
){

fs.mkdirSync(
dir,
{
recursive:
true
}
);

}

function rmDirContents(
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
const name of fs.readdirSync(
dir
)
){
fs.rmSync(
path.join(
dir,
name
),
{
recursive:
true,
force:
true
}
);
}

}

function bakeEdition(
edition
){

const src =
fs.readFileSync(
editionFile,
"utf8"
);

if(
!EDITION_SOURCE_RE.test(
src
)
){
throw new Error(
`Cannot find ALGO_DESKTOP_EDITION assignment in ${editionFile}`
);
}

const next =
src.replace(
EDITION_SOURCE_RE,
`const ALGO_DESKTOP_EDITION =\n"${edition}";`
);

fs.writeFileSync(
editionFile,
next
);
console.log(
`baked ALGO_DESKTOP_EDITION="${edition}"`
);

}

function listReleaseAssets(
dir
){

if(
!fs.existsSync(
dir
)
){
return [];
}

return fs.readdirSync(
dir
).filter(
name=>{
const lower =
name.toLowerCase();

if(
platform ===
"mac"
){
return (
lower.endsWith(
".dmg"
) ||
lower.endsWith(
".zip"
) ||
lower ===
"latest-mac.yml"
);
}

return (
lower.endsWith(
".exe"
) ||
lower.endsWith(
".yml"
) ||
lower.endsWith(
".yaml"
)
);
}
);

}

/**
 * Insert edition letter after semver: Multichart-1.0.74-arm64.dmg → …74f-…
 * Also: Multichart Setup 1.0.74.exe → …74f.exe
 */
function withEditionLetter(
fileName,
edition
){

const escaped =
version.replace(
/\./g,
"\\."
);
const re =
new RegExp(
`(${escaped})(?![fm\\d])`
);

if(
!re.test(
fileName
)
){
return fileName.replace(
/(\.\w+)$/,
`${edition}$1`
);
}

return fileName.replace(
re,
`$1${edition}`
);

}

function runBuilder(){

const env =
{
...process.env,
CSC_IDENTITY_AUTO_DISCOVERY:
process.env.CSC_IDENTITY_AUTO_DISCOVERY ||
"false"
};

const args =
platform ===
"mac"
? [
"electron-builder",
"--mac",
"--publish",
"never"
]
: [
"electron-builder",
"--win",
"--publish",
"never"
];

const result =
spawnSync(
"npx",
args,
{
cwd:
desktopRoot,
env,
stdio:
"inherit",
shell:
process.platform ===
"win32"
}
);

if(
result.status !==
0
){
throw new Error(
"electron-builder failed"
);
}

}

function collectEdition(
edition
){

const assets =
listReleaseAssets(
distDir
);

if(
!assets.length
){
throw new Error(
`No build assets in dist/ after edition ${edition}`
);
}

/** @type {Map<string, string>} */
const renamed =
new Map();

for(
const name of assets
){
const src =
path.join(
distDir,
name
);
const isChannelYml =
/^latest(-mac)?\.ya?ml$/i.test(
name
);

if(
isChannelYml &&
edition !==
"f"
){
console.log(
`skip channel file for m: ${name}`
);
fs.rmSync(
src,
{
force:
true
}
);
continue;
}

if(
isChannelYml
){
continue;
}

const destName =
withEditionLetter(
name,
edition
);
const dest =
path.join(
outDir,
destName
);

fs.renameSync(
src,
dest
);
renamed.set(
name,
destName
);
console.log(
`→ ${destName}`
);
}

// Rewrite auto-update channel YAML paths to f-renamed artifacts.
if(
edition ===
"f"
){
for(
const name of assets
){
if(
!/^latest(-mac)?\.ya?ml$/i.test(
name
)
){
continue;
}

const src =
path.join(
distDir,
name
);
let text =
fs.readFileSync(
src,
"utf8"
);

for(
const [
from,
to
] of renamed
){
text =
text.split(
from
).join(
to
);
}

const dest =
path.join(
outDir,
name
);

fs.writeFileSync(
dest,
text
);
fs.rmSync(
src,
{
force:
true
}
);
console.log(
`→ ${name} (paths updated for f)`
);
}
}

}

const originalEditionSource =
fs.readFileSync(
editionFile,
"utf8"
);

ensureDir(
outDir
);
rmDirContents(
outDir
);

try{
for(
const edition of EDITIONS
){
console.log(
`\n=== Building edition ${edition} (${platform}) ===\n`
);

if(
fs.existsSync(
distDir
)
){
for(
const name of fs.readdirSync(
distDir
)
){
if(
name ===
"editions"
){
continue;
}

fs.rmSync(
path.join(
distDir,
name
),
{
recursive:
true,
force:
true
}
);
}
}

bakeEdition(
edition
);
runBuilder();
collectEdition(
edition
);
}
}finally{
fs.writeFileSync(
editionFile,
originalEditionSource
);
console.log(
"restored algo-trading-edition.cjs"
);
}

const finalAssets =
fs.readdirSync(
outDir
).sort();

console.log(
"\nDual-edition assets:"
);

for(
const name of finalAssets
){
console.log(
`  ${name}`
);
}

if(
finalAssets.length <
2
){
throw new Error(
"Expected both f and m artifacts"
);
}

const hasF =
finalAssets.some(
n=>
n.includes(
`${version}f`
)
);
const hasM =
finalAssets.some(
n=>
n.includes(
`${version}m`
)
);

if(
!hasF ||
!hasM
){
throw new Error(
`Missing edition letter in filenames (f=${hasF}, m=${hasM}): ${finalAssets.join(", ")}`
);
}
