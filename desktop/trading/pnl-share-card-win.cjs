/**
 * Windows-only: генерация PnL-бейджа.
 * 1) bundled tools/pnl-card-generator.exe (PyInstaller, без Python у пользователя)
 * 2) fallback: py / python + Pillow
 * Mac — pnl-share-card.cjs (python3), этот файл не используется.
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
return path.join(
getAppRoot(),
"scripts",
"generate-bingx-pnl-card.py"
);
}

const name =
variant ===
"diary"
? "generate-bybit-pnl-diary-card.py"
: "generate-bybit-pnl-card.py";

return path.join(
getAppRoot(),
"scripts",
name
);

}

function templatePaths(
appRoot,
variant
){

const root =
appRoot ||
getAppRoot();

const exchange =
getActiveExchangeId();

const prefix =
exchange ===
"bingx"
? (
variant ===
"diary"
? "bingx-pnl-diary-template"
: "bingx-pnl-template"
)
: (
variant ===
"diary"
? "bybit-pnl-diary-template"
: "bybit-pnl-template"
);

return {
positive:
path.join(
root,
"assets",
`${prefix}-positive.png`
),
negative:
path.join(
root,
"assets",
`${prefix}-negative.png`
)
};

}

function buildScriptArgs(
scriptPath,
outPath,
payload,
appRoot
){

const args =
[
scriptPath,
"--app-root",
appRoot,
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

const PYTHON_ATTEMPTS =
[
{
cmd:
"py",
argsPrefix:[
"-3"
]
},
{
cmd:
"python",
argsPrefix:[]
},
{
cmd:
"python3",
argsPrefix:[]
}
];

function spawnPythonOnce(
attempt,
scriptArgs,
cwd
){

return new Promise(
(
resolve,
reject
)=>{

const fullArgs =
[
...attempt.argsPrefix,
...scriptArgs
];

const child =
spawn(
attempt.cmd,
fullArgs,
{
cwd,
stdio:[
"ignore",
"pipe",
"pipe"
],
windowsHide:
true
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
`${attempt.cmd} exited ${code}`
)
);
return;
}

resolve();

}
);

}
);

}

function runPythonWithFallback(
scriptArgs,
cwd
){

return new Promise(
(
resolve,
reject
)=>{

let index =
0;

const tryNext =
()=>{

if(
index >=
PYTHON_ATTEMPTS.length
){
reject(
new Error(
"Python 3 не найден. Установите Python 3 с python.org и выполните: pip install Pillow"
)
);
return;
}

const attempt =
PYTHON_ATTEMPTS[
index++
];

spawnPythonOnce(
attempt,
scriptArgs,
cwd
).then(
resolve
).catch(
err=>{

const retryable =
err?.code ===
"ENOENT" ||
/ENOENT/i.test(
String(
err?.message ||
""
)
);

if(
retryable
){
tryNext();
return;
}

reject(
err
);

}
);

};

tryNext();

}
);

}

function getBundledGeneratorExe(){

return path.join(
getAppRoot(),
"tools",
"pnl-card-generator.exe"
);

}

function spawnBundledGenerator(
exePath,
scriptArgs,
cwd
){

return new Promise(
(
resolve,
reject
)=>{

const args =
scriptArgs.slice(
1
);

const child =
spawn(
exePath,
args,
{
cwd,
stdio:[
"ignore",
"pipe",
"pipe"
],
windowsHide:
true
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
`pnl-card-generator.exe exited ${code}`
)
);
return;
}

resolve();

}
);

}
);

}

function runGenerateScript(
outPath,
payload
){

const appRoot =
getAppRoot();
const variant =
payload?.variant;
const scriptPath =
getScriptPath(
variant
);

if(
!fs.existsSync(
scriptPath
)
){
return Promise.reject(
new Error(
"Нет скрипта генерации PnL. Пересоберите desktop-приложение."
)
);
}

const templates =
templatePaths(
appRoot,
variant
);

if(
!fs.existsSync(
templates.positive
) ||
!fs.existsSync(
templates.negative
)
){
return Promise.reject(
new Error(
"Нет шаблона PnL. Пересоберите desktop-приложение."
)
);
}

const scriptArgs =
buildScriptArgs(
scriptPath,
outPath,
payload,
appRoot
);

const bundledExe =
getActiveExchangeId() ===
"bingx"
? ""
: getBundledGeneratorExe();

const run =
bundledExe &&
fs.existsSync(
bundledExe
)
? spawnBundledGenerator(
bundledExe,
scriptArgs,
appRoot
)
: runPythonWithFallback(
scriptArgs,
appRoot
);

return run.then(
()=>{

if(
!fs.existsSync(
outPath
)
){
throw new Error(
"PNG не создан"
);
}

return outPath;

}
);

}

module.exports = {
getAppRoot,
runGenerateScript
};
