/**
 * Main-process mirror of renderer feature-nav prefs (Script / AlgoTrading menu).
 * Defaults off — same as js/desktop-feature-nav-prefs.js.
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
app
} =
require(
"electron"
);

const FILE_NAME =
"feature-nav-prefs.json";

const DEFAULTS =
{
scriptNavEnabled:
false,
algoTradingNavEnabled:
false
};

function storePath(){

return path.join(
app.getPath(
"userData"
),
FILE_NAME
);

}

function readPrefs(){

try{
const raw =
fs.readFileSync(
storePath(),
"utf8"
);
const parsed =
JSON.parse(
raw
);

return {
scriptNavEnabled:
!!parsed?.scriptNavEnabled,
algoTradingNavEnabled:
!!parsed?.algoTradingNavEnabled
};
}catch{
return {
...DEFAULTS
};
}

}

function writePrefs(
next
){

const current =
readPrefs();
const merged =
{
scriptNavEnabled:
next?.scriptNavEnabled ===
undefined
? current.scriptNavEnabled
: !!next.scriptNavEnabled,
algoTradingNavEnabled:
next?.algoTradingNavEnabled ===
undefined
? current.algoTradingNavEnabled
: !!next.algoTradingNavEnabled
};

try{
fs.writeFileSync(
storePath(),
JSON.stringify(
merged,
null,
2
),
"utf8"
);
}catch{
/* ignore */
}

return merged;

}

module.exports =
{
readPrefs,
writePrefs,
DEFAULTS
};
