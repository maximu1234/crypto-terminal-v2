/**
 * macOS: LaunchAgent so Multichart starts with --agent at login.
 * Electron openAsHidden is broken on macOS 13+; argv flag is reliable.
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
execFileSync
} =
require(
"child_process"
);

function getLog(){

try{
return require(
"electron-log"
);
}catch{
return console;
}

}

const AGENT_FLAG =
"--agent";

const LABEL =
"com.multichart.desktop.agent";

function hasAgentArg(
argv = process.argv
){

return (
Array.isArray(
argv
) &&
argv.includes(
AGENT_FLAG
)
);

}

function agentPlistPath(
homeDir
){

return path.join(
homeDir,
"Library",
"LaunchAgents",
`${LABEL}.plist`
);

}

function resolveProgramArguments(){

if(
process.defaultApp
){
const appEntry =
path.resolve(
process.argv[1] ||
"."
);

return [
process.execPath,
appEntry,
AGENT_FLAG
];
}

return [
process.execPath,
AGENT_FLAG
];

}

function escapeXml(
value
){

return String(
value
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

function buildPlistXml(
programArgs
){

const argsXml =
programArgs.map(
arg=>`    <string>${escapeXml(
arg
)}</string>`
).join(
"\n"
);

return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>LimitLoadToSessionType</key>
  <string>Aqua</string>
</dict>
</plist>
`;

}

function launchctlBootout(
uid
){

try{
execFileSync(
"launchctl",
[
"bootout",
`gui/${uid}/${LABEL}`
],
{
stdio:
"ignore"
}
);
}catch{
/* not loaded */
}

}

function launchctlBootstrap(
uid,
plistPath
){

execFileSync(
"launchctl",
[
"bootstrap",
`gui/${uid}`,
plistPath
],
{
stdio:
"ignore"
}
);

}

function setDarwinLoginAgentEnabled(
enabled,
{
homeDir =
process.env.HOME ||
"",
uid =
typeof process.getuid ===
"function"
? process.getuid()
: null
} = {}
){

if(
!homeDir ||
uid ==
null
){
throw new Error(
"login agent: missing home/uid"
);
}

const plistPath =
agentPlistPath(
homeDir
);

launchctlBootout(
uid
);

if(
!enabled
){
try{
fs.unlinkSync(
plistPath
);
}catch{
/* ignore */
}

getLog().info(
"login agent: disabled"
);
return {
ok:
true,
enabled:
false
};
}

const programArgs =
resolveProgramArguments();
const xml =
buildPlistXml(
programArgs
);

fs.mkdirSync(
path.dirname(
plistPath
),
{
recursive:
true
}
);
fs.writeFileSync(
plistPath,
xml,
{
mode:
0o644
}
);

try{
launchctlBootstrap(
uid,
plistPath
);
}catch(
err
){
getLog().warn(
"login agent bootstrap:",
err?.message ||
err
);
throw err;
}

getLog().info(
"login agent: enabled",
programArgs.join(
" "
)
);

return {
ok:
true,
enabled:
true
};

}

module.exports =
{
AGENT_FLAG,
LABEL,
hasAgentArg,
setDarwinLoginAgentEnabled,
resolveProgramArguments,
buildPlistXml
};
