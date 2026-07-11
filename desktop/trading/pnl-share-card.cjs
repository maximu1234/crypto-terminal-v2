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

function getScriptPath(
variant
){

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
`generate-bybit-pnl-card.py exited ${code}`
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

if(
!tempPath ||
!fs.existsSync(
tempPath
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
tempPath,
filePath
);

try{
fs.unlinkSync(
tempPath
);
}catch{
/* ignore */
}

return {
ok:
true,
filePath,
tempDiscarded:
true
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

try{
if(
fs.existsSync(
tempPath
)
){
fs.unlinkSync(
tempPath
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
