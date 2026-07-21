/**
 * Load algo pattern ESM modules in Electron main.
 * Strips browser ?v= query suffixes and caches a temp copy.
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const os =
require(
"os"
);
const {
pathToFileURL
} =
require(
"url"
);
const log =
require(
"electron-log"
);

const SOURCE_FILES =
[
"algo-trading/pattern-entry-logic.js",
"algo-trading/pattern-12-math.js",
"indicators.js"
];

/** @type {{ patternEntry: object, patternMath: object } | null} */
let cached =
null;

function repoJsRoot(){

return path.join(
__dirname,
"../../js"
);

}

function cacheRoot(){

return path.join(
os.tmpdir(),
"crypto-terminal-algo-bot-esm"
);

}

function stripVersionSuffix(
source
){

return String(
source ||
""
).replace(
/(from\s+["'][^"']+)\?v=[^"']+(["'])/g,
"$1$2"
);

}

function toMjsRel(
rel
){
return String(
rel ||
""
).replace(
/\.js$/i,
".mjs"
);
}

function rewriteRelativeJsImportsToMjs(
source
){
return String(
source ||
""
).replace(
/(from\s+["'])(\.\.?\/[^"']+)\.js(["'])/g,
"$1$2.mjs$3"
);
}

function syncModuleCache(){

const srcRoot =
repoJsRoot();
const destRoot =
cacheRoot();

for(
const rel of SOURCE_FILES
){

const srcPath =
path.join(
srcRoot,
rel
);
const destPath =
path.join(
destRoot,
toMjsRel(
rel
)
);

if(
!fs.existsSync(
srcPath
)
){
throw new Error(
`Algo pattern source missing: ${rel}`
);
}

const nextSource =
rewriteRelativeJsImportsToMjs(
stripVersionSuffix(
fs.readFileSync(
srcPath,
"utf8"
)
)
);
const prevSource =
fs.existsSync(
destPath
)
? fs.readFileSync(
destPath,
"utf8"
)
: "";

if(
nextSource !==
prevSource
){
fs.mkdirSync(
path.dirname(
destPath
),
{
recursive:
true
}
);
fs.writeFileSync(
destPath,
nextSource,
"utf8"
);
}

}

}

async function loadPatternModules(){

if(
cached
){
return cached;
}

try{
syncModuleCache();

const destRoot =
cacheRoot();
const patternEntry =
await import(
pathToFileURL(
path.join(
destRoot,
"algo-trading/pattern-entry-logic.mjs"
)
).href
);
const patternMath =
await import(
pathToFileURL(
path.join(
destRoot,
"algo-trading/pattern-12-math.mjs"
)
).href
);

if(
typeof patternEntry?.resolvePatternSetupEvent !==
"function" ||
typeof patternMath?.computePattern12Scene !==
"function"
){
throw new Error(
"Algo pattern modules loaded with missing exports"
);
}

cached =
{
patternEntry,
patternMath
};

return cached;
}catch(
err
){
log.error(
"algo bot pattern module load failed:",
err?.stack ||
err?.message ||
err
);
throw err;
}

}

module.exports =
{
loadPatternModules
};
