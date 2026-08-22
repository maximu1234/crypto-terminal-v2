/**
 * Скриншот области графика Терминала: буфер обмена / «Сохранить как…» PNG.
 */
"use strict";

const {
app,
BrowserWindow,
clipboard,
dialog,
ipcMain
} =
require(
"electron"
);
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const log =
require(
"electron-log"
);

function normalizeRect(
rect
){

if(
!rect ||
typeof rect !==
"object"
){
return null;
}

const x =
Math.round(
Number(
rect.x
)
);
const y =
Math.round(
Number(
rect.y
)
);
const width =
Math.round(
Number(
rect.width
)
);
const height =
Math.round(
Number(
rect.height
)
);

if(
![
x,
y,
width,
height
].every(
Number.isFinite
)
){
return null;
}

if(
width <
1 ||
height <
1
){
return null;
}

return {
x,
y,
width,
height
};

}

async function captureFromEvent(
event,
rect
){

const area =
normalizeRect(
rect
);

if(
!area
){
return {
ok:
false,
error:
"Некорректная область захвата"
};
}

const wc =
event.sender;

if(
!wc ||
wc.isDestroyed?.()
){
return {
ok:
false,
error:
"Окно недоступно"
};
}

if(
process.platform ===
"win32"
){
const {
captureChartAreaWin
} =
require(
"./chart-snapshot-win.cjs"
);

return captureChartAreaWin(
wc,
area
);
}

const image =
await wc.capturePage(
area
);

if(
!image ||
image.isEmpty()
){
return {
ok:
false,
error:
"Пустой скриншот"
};
}

return {
ok:
true,
image
};

}

function safeSnapshotFileName(
raw
){

let name =
path.basename(
String(
raw ||
""
).trim() ||
"chart.png"
);

if(
!name ||
name ===
"." ||
name ===
".."
){
name =
"chart.png";
}

if(
!/\.png$/i.test(
name
)
){
name =
`${name}.png`;
}

return name;

}

function registerChartSnapshotIpc(
opts =
{}
){

const handleTrustedDesktopUi =
opts.handleTrustedDesktopUi;

if(
typeof handleTrustedDesktopUi !==
"function"
){
return;
}

handleTrustedDesktopUi(
ipcMain,
"desktop:chartSnapshotCopy",
async (
event,
payload
)=>{

try{
const result =
await captureFromEvent(
event,
payload?.rect
);

if(
!result.ok
){
return {
ok:
false,
error:
result.error
};
}

clipboard.writeImage(
result.image
);

return {
ok:
true
};
}catch(
err
){
log.warn(
"desktop:chartSnapshotCopy:",
err?.message ||
err
);
return {
ok:
false,
error:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,
"desktop:chartSnapshotSave",
async (
event,
payload
)=>{

try{
const result =
await captureFromEvent(
event,
payload?.rect
);

if(
!result.ok
){
return {
ok:
false,
error:
result.error
};
}

const win =
BrowserWindow.fromWebContents(
event.sender
);

const defaultName =
safeSnapshotFileName(
payload?.defaultName
);

const {
canceled,
filePath
} =
await dialog.showSaveDialog(
win ||
undefined,
{
title:
"Сохранить скриншот",
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
true,
canceled:
true
};
}

fs.writeFileSync(
filePath,
result.image.toPNG()
);

return {
ok:
true,
filePath
};
}catch(
err
){
log.warn(
"desktop:chartSnapshotSave:",
err?.message ||
err
);
return {
ok:
false,
error:
err?.message ||
String(
err
)
};
}

}
);

}

module.exports =
{
registerChartSnapshotIpc,
safeSnapshotFileName
};
