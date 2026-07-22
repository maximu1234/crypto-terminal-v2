/**
 * Бейдж «Поделиться PnL» — генерация PNG и диалог «Сохранить как…».
 */
const {
spawn
} =
require(
"child_process"
);
const fs =
require(
"fs"
);
const os =
require(
"os"
);
const path =
require(
"path"
);
const {
dialog,
app
} =
require(
"electron"
);

function assertPnlTempPath(
tempPath
){

const raw =
String(
tempPath ||
""
).trim();

if(
!raw
){
throw new Error(
"invalid tempPath"
);
}

const resolved =
fs.realpathSync(
path.resolve(
raw
)
);
const tmpRoot =
fs.realpathSync(
os.tmpdir()
);
const prefix =
tmpRoot.endsWith(
path.sep
)
? tmpRoot
: tmpRoot +
path.sep;

if(
!resolved.startsWith(
prefix
)
){
throw new Error(
"tempPath outside tmp"
);
}

if(
!path.basename(
resolved
).startsWith(
"crypto-terminal-pnl-"
)
){
throw new Error(
"tempPath not a pnl card"
);
}

return resolved;

}

function getAppRoot(){

if(
app.isPackaged
){
return process.resourcesPath;
}

return path.resolve(
__dirname,
"..",
".."
);

}

const SCRIPT_POSITION =
path.join(
getAppRoot(),
"scripts",
"generate-bybit-pnl-card.py"
);

const SCRIPT_DIARY =
path.join(
getAppRoot(),
"scripts",
"generate-bybit-pnl-diary-card.py"
);

const SCRIPT_BINGX =
path.join(
getAppRoot(),
"scripts",
"generate-bingx-pnl-card.py"
);

function getActiveExchangeId(){

try{
return require(
"./trading-router.cjs"
).getActiveExchange();
}catch{
return "bybit";
}

}

function getScriptPath(
variant
){

if(
getActiveExchangeId() ===
"bingx"
){
return SCRIPT_BINGX;
}

return variant ===
"diary"
? SCRIPT_DIARY
: SCRIPT_POSITION;

}

function buildGenerateArgs(
scriptPath,
outPath,
payload
){

const args =
[
scriptPath,
"--ticker",
String(
payload.ticker ||
""
),
"--side",
payload.side ===
"short"
? "short"
: "long",
"--leverage",
String(
Math.max(
1,
Number(
payload.leverage
) ||
1
)
),
"--roi",
String(
Number(
payload.roiPct
) ||
0
),
"--entry",
String(
Number(
payload.entryPrice
) ||
0
),
payload.variant ===
"diary"
? "--filled"
: "--market",
String(
Number(
payload.marketPrice
) ||
0
),
"-o",
outPath
];

if(
getActiveExchangeId() ===
"bingx"
){
args.push(
"--variant",
payload.variant ===
"diary"
? "diary"
: "position"
);
}

if(
Number.isInteger(
payload.priceDecimals
)
){
args.push(
"--decimals",
String(
payload.priceDecimals
)
);
}

return args;

}

function runGenerateScript(
outPath,
payload
){

if(
process.platform ===
"win32"
){
return require(
"./pnl-share-card-win.cjs"
).runGenerateScript(
outPath,
payload
);
}

return runGenerateScriptMac(
outPath,
payload
);

}

function runGenerateScriptMac(
outPath,
payload
){

return new Promise(
(
resolve,
reject
)=>{

const scriptPath =
getScriptPath(
payload?.variant
);
const args =
buildGenerateArgs(
scriptPath,
outPath,
payload
);

const child =
spawn(
"python3",
args,
{
cwd:
getAppRoot(),
stdio:
[
"ignore",
"pipe",
"pipe"
]
}
);

let stderr =
"";

child.stderr.on(
"data",
chunk=>{
stderr +=
String(
chunk
);
}
);

child.on(
"error",
err=>{
reject(
err
);
}
);

child.on(
"close",
code=>{

if(
code !==
0
){
reject(
new Error(
stderr.trim() ||
`pnl share card exited ${code}`
)
);
return;
}

if(
!fs.existsSync(
outPath
)
){
reject(
new Error(
"PNG not created"
)
);
return;
}

resolve(
outPath
);

}
);

}
);

}

async function generatePnlShareCard(
payload
){

const outPath =
path.join(
os.tmpdir(),
`crypto-terminal-pnl-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
);

await runGenerateScript(
outPath,
payload
);

const data =
fs.readFileSync(
outPath
);

return {
ok:
true,
tempPath:
outPath,
dataUrl:
`data:image/png;base64,${data.toString("base64")}`
};

}

async function savePnlShareCard(
tempPath,
defaultName =
"pnl-share.png"
){

let safePath;

try{
safePath =
assertPnlTempPath(
tempPath
);
}catch{
return {
ok:
false,
error:
"Временный файл не найден"
};
}

if(
!fs.existsSync(
safePath
)
){
return {
ok:
false,
error:
"Временный файл не найден"
};
}

const browserWindow =
require(
"electron"
).BrowserWindow.getFocusedWindow();

const {
canceled,
filePath
} =
await dialog.showSaveDialog(
browserWindow ||
undefined,
{
title:
"Сохранить бейдж Поделиться PnL",
defaultPath:
path.join(
app.getPath(
"downloads"
),
defaultName
),
filters:
[
{
name:
"PNG",
extensions:
[
"png"
]
}
]
}
);

if(
canceled ||
!filePath
){
return {
ok:
false,
canceled:
true
};
}

await fs.promises.copyFile(
safePath,
filePath
);

try{
fs.unlinkSync(
safePath
);
}catch{
/* ignore */
}

return {
ok:
true,
filePath
};

}

function discardPnlShareCard(
tempPath
){

if(
!tempPath
){
return {
ok:
true
};
}

let safePath;

try{
safePath =
assertPnlTempPath(
tempPath
);
}catch{
return {
ok:
false,
error:
"invalid tempPath"
};
}

try{
if(
fs.existsSync(
safePath
)
){
fs.unlinkSync(
safePath
);
}
return {
ok:
true
};
}catch(
err
){
return {
ok:
false,
error:
String(
err?.message ||
err
)
};
}

}

module.exports =
{
generatePnlShareCard,
savePnlShareCard,
discardPnlShareCard
};
