/**
 * Main-process prefs for menu-bar tray / login agent (macOS).
 * Renderer localStorage is mirrored here so agent boot works without a window.
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
"menu-bar-tray-prefs.json";

const DEFAULTS =
{
trayEnabled:
true,
launchAgentAtLogin:
false,
pnlHidden:
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
trayEnabled:
parsed?.trayEnabled !==
false,
launchAgentAtLogin:
!!parsed?.launchAgentAtLogin,
pnlHidden:
!!parsed?.pnlHidden
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
trayEnabled:
next?.trayEnabled !==
false,
launchAgentAtLogin:
!!next?.launchAgentAtLogin,
pnlHidden:
!!(
next?.pnlHidden ??
current.pnlHidden
)
};

if(
merged.launchAgentAtLogin &&
!merged.trayEnabled
){
merged.trayEnabled =
true;
}

if(
!merged.trayEnabled
){
merged.launchAgentAtLogin =
false;
}

try{
fs.mkdirSync(
path.dirname(
storePath()
),
{
recursive:
true
}
);
fs.writeFileSync(
storePath(),
`${JSON.stringify(
merged,
null,
2
)}\n`,
{
mode:
0o600
}
);
}catch{
/* ignore */
}

return merged;

}

function setTrayEnabled(
enabled
){

const current =
readPrefs();

return writePrefs(
{
...current,
trayEnabled:
!!enabled
}
);

}

function setLaunchAgentAtLogin(
enabled
){

const current =
readPrefs();

return writePrefs(
{
...current,
launchAgentAtLogin:
!!enabled,
trayEnabled:
enabled
? true
: current.trayEnabled
}
);

}

function setPnlHidden(
hidden
){

const current =
readPrefs();

return writePrefs(
{
...current,
pnlHidden:
!!hidden
}
);

}

module.exports =
{
readPrefs,
writePrefs,
setTrayEnabled,
setLaunchAgentAtLogin,
setPnlHidden
};
