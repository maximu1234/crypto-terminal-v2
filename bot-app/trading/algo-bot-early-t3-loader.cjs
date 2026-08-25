/**
 * Load Early T3 math ESM in Electron main. Separate cache from Pattern 1-2 bot.
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
"algo-trading/pattern-12-early-t3-math.js",
"indicators.js"
];

/** @type {{ patternMath: object } | null} */
let cached =
null;

function repoJsRoot(){

const candidates =
[];

if(
process.resourcesPath
){
candidates.push(
path.join(
process.resourcesPath,
"app.asar.unpacked",
"site-bundle",
"js"
)
);
candidates.push(
path.join(
process.resourcesPath,
"app.asar",
"site-bundle",
"js"
)
);
}

candidates.push(
path.join(
__dirname,
"../site-bundle/js"
)
);
candidates.push(
path.join(
__dirname,
"../../js"
)
);

for(
const root of candidates
){

try{
if(
fs.existsSync(
path.join(
root,
"algo-trading/pattern-12-early-t3-math.js"
)
)
){
return root;
}
}catch{
/* ignore */
}

}

return candidates[
candidates.length -
1
] ||
"";

}

function cacheRoot(){

return path.join(
os.tmpdir(),
"crypto-terminal-algo-bot-early-t3-esm"
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
`Early T3 source missing: ${rel} (jsRoot=${srcRoot})`
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

async function loadEarlyT3PatternModules(){

if(
cached
){
return cached;
}

try{
syncModuleCache();

const destRoot =
cacheRoot();
const patternMath =
await import(
pathToFileURL(
path.join(
destRoot,
"algo-trading/pattern-12-early-t3-math.mjs"
)
).href
);

if(
typeof patternMath?.computePattern12Scene !==
"function"
){
throw new Error(
"Early T3 math loaded without computePattern12Scene"
);
}

cached =
{
patternMath
};

return cached;
}catch(
err
){
log.error(
"algo bot early t3 module load failed:",
err?.stack ||
err?.message ||
err
);
throw err;
}

}

module.exports =
{
loadEarlyT3PatternModules
};
