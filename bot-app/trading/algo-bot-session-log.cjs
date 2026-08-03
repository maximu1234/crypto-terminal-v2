/**
 * Persist Status signal lines to one text file per bot session.
 * Folder: <app logs>/algo-bot-sessions/
 * File:   YYYY-MM-DD_HHMMSS_s{sessionId}_{strategyId}.log
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);

const SESSIONS_SUBDIR =
"algo-bot-sessions";

/** @type {string | null} */
let logsDirOverride =
null;

/** @type {string | null} */
let activeFilePath =
null;

/** @type {{ sessionId: number, strategyId: string, startedAt: number } | null} */
let activeMeta =
null;

/**
 * @param {string | null} dir Absolute path, or null to use Electron logs dir.
 */
function setSessionsDirForTests(
dir
){

logsDirOverride =
dir
? String(
dir
)
: null;

}

function pad2(
n
){

return String(
n
).padStart(
2,
"0"
);

}

/**
 * Local wall-clock stamp for filenames: 2026-08-03_134812
 * @param {Date} [date]
 * @returns {string}
 */
function formatFileStamp(
date =
new Date()
){

return `${date.getFullYear()}-${pad2(
date.getMonth() +
1
)}-${pad2(
date.getDate()
)}_${pad2(
date.getHours()
)}${pad2(
date.getMinutes()
)}${pad2(
date.getSeconds()
)}`;

}

/**
 * ISO-ish local time for log lines.
 * @param {number} [ts]
 * @returns {string}
 */
function formatLineTime(
ts =
Date.now()
){

const date =
new Date(
Number(
ts
) ||
Date.now()
);

return `${date.getFullYear()}-${pad2(
date.getMonth() +
1
)}-${pad2(
date.getDate()
)} ${pad2(
date.getHours()
)}:${pad2(
date.getMinutes()
)}:${pad2(
date.getSeconds()
)}.${String(
date.getMilliseconds()
).padStart(
3,
"0"
)}`;

}

function resolveSessionsDir(){

if(
logsDirOverride
){
return logsDirOverride;
}

try{
const {
app
} =
require(
"electron"
);
const logsRoot =
app.getPath(
"logs"
);

return path.join(
logsRoot,
SESSIONS_SUBDIR
);
}catch{
return path.join(
process.cwd(),
SESSIONS_SUBDIR
);
}

}

function ensureSessionsDir(){

const dir =
resolveSessionsDir();

fs.mkdirSync(
dir,
{
recursive:
true
}
);

return dir;

}

function safeAppend(
line
){

if(
!activeFilePath
){
return;
}

try{
fs.appendFileSync(
activeFilePath,
line.endsWith(
"\n"
)
? line
: `${line}\n`,
"utf8"
);
}catch{
/* never break the bot for logging */
}

}

/**
 * Open a new session log file. Closes any previous session first.
 * @param {{ sessionId: number, strategyId?: string, startedAt?: number, tradingMode?: string, watchlistCount?: number }} meta
 * @returns {{ ok: boolean, path?: string }}
 */
function beginSession(
meta =
{}
){

endSession(
{
message:
"superseded by new session"
}
);

const sessionId =
Math.max(
0,
Math.floor(
Number(
meta.sessionId
) ||
0
)
);
const strategyId =
String(
meta.strategyId ||
"st1"
).trim().toLowerCase() ||
"st1";
const startedAt =
Number(
meta.startedAt
) ||
Date.now();
const stamp =
formatFileStamp(
new Date(
startedAt
)
);
const fileName =
`${stamp}_s${sessionId}_${strategyId}.log`;

try{
const dir =
ensureSessionsDir();
const filePath =
path.join(
dir,
fileName
);
const header =
[
`# Algo Bot session status log`,
`# sessionId: ${sessionId}`,
`# strategyId: ${strategyId}`,
`# startedAt: ${new Date(
startedAt
).toISOString()}`,
`# tradingMode: ${String(
meta.tradingMode ||
""
) || "—"}`,
`# watchlistCount: ${Number.isFinite(
Number(
meta.watchlistCount
)
)
? Number(
meta.watchlistCount
)
: "—"}`,
`# file: ${fileName}`,
`#`
].join(
"\n"
) +
"\n";

fs.writeFileSync(
filePath,
header,
"utf8"
);
activeFilePath =
filePath;
activeMeta =
{
sessionId,
strategyId,
startedAt
};

return {
ok:
true,
path:
filePath
};
}catch(
err
){
activeFilePath =
null;
activeMeta =
null;

return {
ok:
false,
message:
String(
err?.message ||
err
)
};
}

}

/**
 * Append one Status signal row (same shape as pushSignal entry).
 * @param {{ ts?: number, symbol?: string, side?: string, price?: number, text?: string }} entry
 */
function appendSignal(
entry =
{}
){

if(
!activeFilePath
){
return;
}

const ts =
Number(
entry.ts
) ||
Date.now();
const symbol =
String(
entry.symbol ||
"—"
).trim() ||
"—";
const side =
String(
entry.side ||
"—"
).trim() ||
"—";
const text =
String(
entry.text ||
""
).replace(
/\s+/g,
" "
).trim();
const price =
Number(
entry.price
);
const pricePart =
Number.isFinite(
price
) &&
price >
0
? ` price=${price}`
: "";

safeAppend(
`${formatLineTime(
ts
)} | ${symbol} | ${side}${pricePart} | ${text}`
);

}

/**
 * Free-form note (start/stop / errors).
 * @param {string} text
 * @param {number} [ts]
 */
function appendNote(
text,
ts =
Date.now()
){

if(
!activeFilePath
){
return;
}

const line =
String(
text ||
""
).replace(
/\s+/g,
" "
).trim();

if(
!line
){
return;
}

safeAppend(
`${formatLineTime(
ts
)} | — | — | ${line}`
);

}

/**
 * Close the active session file (writes footer). Safe to call when idle.
 * @param {{ message?: string }} [opts]
 */
function endSession(
opts =
{}
){

if(
!activeFilePath
){
return;
}

const message =
String(
opts.message ||
""
).trim();
const endedAt =
Date.now();

safeAppend(
`#`
);
safeAppend(
`# endedAt: ${new Date(
endedAt
).toISOString()}`
);

if(
message
){
safeAppend(
`# stopMessage: ${message}`
);
}

if(
activeMeta
){
safeAppend(
`# sessionId: ${activeMeta.sessionId}`
);
}

activeFilePath =
null;
activeMeta =
null;

}

function getActiveSessionLogPath(){

return activeFilePath;

}

function getSessionsDir(){

return resolveSessionsDir();

}

/**
 * @param {string} name
 * @returns {boolean}
 */
function isSafeSessionFileName(
name
){

const base =
path.basename(
String(
name ||
""
)
);

return (
base ===
String(
name ||
""
).trim() &&
/^[A-Za-z0-9._-]+\.log$/.test(
base
) &&
!base.includes(
".."
)
);

}

/**
 * @returns {{ ok: boolean, dir?: string, files?: Array<{ name: string, size: number, mtimeMs: number }>, message?: string }}
 */
function listSessionFiles(){

try{
const dir =
ensureSessionsDir();
const files =
fs.readdirSync(
dir
).filter(
(
name
)=>
isSafeSessionFileName(
name
)
).map(
(
name
)=>{
const full =
path.join(
dir,
name
);
const st =
fs.statSync(
full
);

return {
name,
size:
Number(
st.size
) ||
0,
mtimeMs:
Number(
st.mtimeMs
) ||
0
};
}
).sort(
(
a,
b
)=>
b.mtimeMs -
a.mtimeMs
);

return {
ok:
true,
dir,
files
};
}catch(
err
){
return {
ok:
false,
message:
String(
err?.message ||
err
)
};
}

}

/**
 * @param {string} name
 * @returns {{ ok: boolean, name?: string, text?: string, message?: string }}
 */
function readSessionFile(
name
){

if(
!isSafeSessionFileName(
name
)
){
return {
ok:
false,
message:
"Invalid log file name"
};
}

try{
const full =
path.join(
ensureSessionsDir(),
path.basename(
name
)
);
const text =
fs.readFileSync(
full,
"utf8"
);

return {
ok:
true,
name:
path.basename(
name
),
text
};
}catch(
err
){
return {
ok:
false,
message:
String(
err?.message ||
err
)
};
}

}

module.exports =
{
SESSIONS_SUBDIR,
beginSession,
endSession,
appendSignal,
appendNote,
getActiveSessionLogPath,
getSessionsDir,
listSessionFiles,
readSessionFile,
isSafeSessionFileName,
setSessionsDirForTests,
formatFileStamp,
formatLineTime
};
