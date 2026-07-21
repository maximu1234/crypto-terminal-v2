/**
 * Ensure every local require() from desktop main-process entrypoints
 * resolves to a file that electron-builder will pack (asar).
 *
 * Run from repo root: node desktop/scripts/check-packaged-requires.cjs
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const {
createRequire
} =
require(
"module"
);

const desktopRoot =
path.join(
__dirname,
".."
);
const pkg =
JSON.parse(
fs.readFileSync(
path.join(
desktopRoot,
"package.json"
),
"utf8"
)
);
const fileGlobs =
pkg.build?.files ||
[];

const ENTRYPOINTS =
[
"main.js",
"preload.js",
"tray-popup-preload.cjs",
"after-pack.cjs"
];

function matchesPackaged(
relPosix
){

for(
const pattern of fileGlobs
){
if(
pattern.startsWith(
"!"
)
){
continue;
}

if(
pattern.endsWith(
"/**"
)
){
const prefix =
pattern.slice(
0,
-3
);

if(
relPosix ===
prefix ||
relPosix.startsWith(
`${prefix}/`
)
){
return true;
}

continue;
}

if(
pattern.startsWith(
"*."
)
){
const ext =
pattern.slice(
1
);

if(
relPosix.includes(
"/"
)
){
continue;
}

if(
relPosix.endsWith(
ext
)
){
return true;
}

continue;
}

if(
relPosix ===
pattern
){
return true;
}
}

return false;
}

function collectLocalRequires(
filePath,
seen,
missing
){

const rel =
path.relative(
desktopRoot,
filePath
).split(
path.sep
).join(
"/"
);

if(
seen.has(
rel
)
){
return;
}

seen.add(
rel
);

if(
!matchesPackaged(
rel
)
){
missing.push(
rel
);
}

let src =
"";

try{
src =
fs.readFileSync(
filePath,
"utf8"
);
}catch{
missing.push(
`${rel} (unreadable)`
);
return;
}

const re =
/require\(\s*["'](\.[^"']+)["']\s*\)/g;
let match;

while(
(
match =
re.exec(
src
)
)
){
const spec =
match[1];
const resolved =
path.resolve(
path.dirname(
filePath
),
spec
);
const withExt =
fs.existsSync(
resolved
)
? resolved
: fs.existsSync(
`${resolved}.cjs`
)
? `${resolved}.cjs`
: fs.existsSync(
`${resolved}.js`
)
? `${resolved}.js`
: null;

if(
!withExt
){
missing.push(
`${rel} → missing ${spec}`
);
continue;
}

if(
!withExt.startsWith(
desktopRoot
)
){
continue;
}

collectLocalRequires(
withExt,
seen,
missing
);
}

}

const seen =
new Set();
const missing =
[];

for(
const entry of ENTRYPOINTS
){
const abs =
path.join(
desktopRoot,
entry
);

if(
!fs.existsSync(
abs
)
){
missing.push(
`missing entry ${entry}`
);
continue;
}

collectLocalRequires(
abs,
seen,
missing
);
}

if(
missing.length
){
console.error(
"Packaged-requires check FAILED:"
);

for(
const item of [
...new Set(
missing
)
].sort()
){
console.error(
`  - ${item}`
);
}

process.exit(
1
);
}

console.log(
`Packaged-requires OK (${seen.size} local modules, globs: ${fileGlobs.join(", ")})`
);
