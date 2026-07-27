/**
 * Windows: Login Item so Multichart starts with --agent at login.
 * Uses Electron setLoginItemSettings (HKCU Run / Startup folder path).
 */
const path =
require(
"path"
);
const {
AGENT_FLAG,
hasAgentArg
} =
require(
"./agent-argv.cjs"
);

function getLog(){

try{
const electronLog =
require(
"electron-log"
);

if(
typeof electronLog?.info ===
"function" &&
process.versions?.electron
){
return electronLog;
}
}catch{
/* ignore */
}

return console;

}

function getElectronApp(){

return require(
"electron"
).app;

}

function resolveLoginItemSettings(
enabled
){

if(
!enabled
){
return {
openAtLogin:
false,
path:
process.execPath,
args:[]
};
}

if(
process.defaultApp
){
const appEntry =
path.resolve(
process.argv[1] ||
"."
);

return {
openAtLogin:
true,
path:
process.execPath,
args:[
appEntry,
AGENT_FLAG
]
};
}

return {
openAtLogin:
true,
path:
process.execPath,
args:[
AGENT_FLAG
]
};

}

function setWin32LoginAgentEnabled(
enabled,
{
app:
appOverride
} = {}
){

const electronApp =
appOverride ||
getElectronApp();
const settings =
resolveLoginItemSettings(
!!enabled
);

electronApp.setLoginItemSettings(
settings
);

try{
getLog().info(
"login agent (win32):",
enabled
? `enabled ${settings.path} ${settings.args.join(
" "
)}`
: "disabled"
);
}catch{
/* ignore */
}

return {
ok:
true,
enabled:
!!enabled
};

}

module.exports =
{
AGENT_FLAG,
hasAgentArg,
resolveLoginItemSettings,
setWin32LoginAgentEnabled
};
