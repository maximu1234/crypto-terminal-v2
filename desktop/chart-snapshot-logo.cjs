/**
 * Логотип блогера для скриншота графика Терминала.
 * userData: оригинал PNG + ч/б ресайз под экран; prefs — включено/выключено.
 */
"use strict";

const {
app,
BrowserWindow,
dialog,
ipcMain,
nativeImage,
screen
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

const PREFS_FILE =
"chart-snapshot-logo-prefs.json";
const ORIGINAL_FILE =
"chart-snapshot-logo-original.png";
const BW_FILE =
"chart-snapshot-logo-bw.png";

function prefsPath(){

return path.join(
app.getPath(
"userData"
),
PREFS_FILE
);

}

function originalPath(){

return path.join(
app.getPath(
"userData"
),
ORIGINAL_FILE
);

}

function bwPath(){

return path.join(
app.getPath(
"userData"
),
BW_FILE
);

}

function readPrefs(){

try{
const raw =
fs.readFileSync(
prefsPath(),
"utf8"
);
const parsed =
JSON.parse(
raw
);

return {
enabled:
!!parsed?.enabled
};
}catch{
return {
enabled:
false
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
enabled:
next?.enabled ===
undefined
? current.enabled
: !!next.enabled
};

fs.writeFileSync(
prefsPath(),
`${JSON.stringify(merged, null, 2)}\n`,
"utf8"
);

return merged;

}

function hasLogoFiles(){

try{
return fs.existsSync(
bwPath()
) &&
fs.statSync(
bwPath()
).size >
0;
}catch{
return false;
}

}

function toGrayscaleImage(
image
){

const size =
image.getSize();
const width =
size.width;
const height =
size.height;
const buf =
Buffer.from(
image.toBitmap()
);
const mac =
process.platform ===
"darwin";

for(
let i =
0;
i <
buf.length;
i +=
4
){

const r =
mac
? buf[
i
]
: buf[
i +
2
];
const g =
buf[
i +
1
];
const b =
mac
? buf[
i +
2
]
: buf[
i
];
const gray =
Math.round(
0.299 *
r +
0.587 *
g +
0.114 *
b
);

if(
mac
){
buf[
i
] =
gray;
buf[
i +
1
] =
gray;
buf[
i +
2
] =
gray;
}else{
buf[
i
] =
gray;
buf[
i +
1
] =
gray;
buf[
i +
2
] =
gray;
}

}

return nativeImage.createFromBitmap(
buf,
{
width,
height
}
);

}

function targetLogoHeightPx(){

try{
const display =
screen.getPrimaryDisplay();
const h =
Number(
display?.workAreaSize?.height
) ||
Number(
display?.size?.height
) ||
900;

return Math.max(
48,
Math.round(
h /
5
)
);
}catch{
return 180;
}

}

function processAndStoreLogo(
sourcePath
){

const image =
nativeImage.createFromPath(
sourcePath
);

if(
!image ||
image.isEmpty()
){
return {
ok:
false,
error:
"Не удалось прочитать изображение"
};
}

const originalPng =
image.toPNG();

fs.writeFileSync(
originalPath(),
originalPng
);

const size =
image.getSize();
const targetH =
targetLogoHeightPx();
let working =
image;

if(
size.height >
0 &&
size.height !==
targetH
){
const scale =
targetH /
size.height;
const targetW =
Math.max(
1,
Math.round(
size.width *
scale
)
);

working =
image.resize(
{
width:
targetW,
height:
targetH,
quality:
"best"
}
);
}

const bw =
toGrayscaleImage(
working
);

fs.writeFileSync(
bwPath(),
bw.toPNG()
);

return {
ok:
true,
hasLogo:
true
};

}

function getStatus(){

return {
ok:
true,
enabled:
!!readPrefs().enabled,
hasLogo:
hasLogoFiles()
};

}

function getBwDataUrl(){

if(
!hasLogoFiles()
){
return {
ok:
false,
error:
"Логотип не загружен"
};
}

try{
const image =
nativeImage.createFromPath(
bwPath()
);

if(
!image ||
image.isEmpty()
){
return {
ok:
false,
error:
"Пустой файл логотипа"
};
}

return {
ok:
true,
dataUrl:
image.toDataURL()
};
}catch(
err
){
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

function registerChartSnapshotLogoIpc(){

ipcMain.handle(
"desktop:chartSnapshotLogoGet",
()=>
getStatus()
);

ipcMain.handle(
"desktop:chartSnapshotLogoSetEnabled",
(
_event,
payload
)=>{

try{
const prefs =
writePrefs(
{
enabled:
!!payload?.enabled
}
);

return {
ok:
true,
enabled:
prefs.enabled,
hasLogo:
hasLogoFiles()
};
}catch(
err
){
log.warn(
"desktop:chartSnapshotLogoSetEnabled:",
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

ipcMain.handle(
"desktop:chartSnapshotLogoPick",
async (
event
)=>{

try{
const wc =
event.sender;
const win =
BrowserWindow.fromWebContents(
wc
);
const {
canceled,
filePaths
} =
await dialog.showOpenDialog(
win ||
undefined,
{
title:
"Логотип для скриншота",
properties:
[
"openFile"
],
filters:
[
{
name:
"Images",
extensions:
[
"png",
"jpg",
"jpeg"
]
},
{
name:
"PNG",
extensions:
[
"png"
]
},
{
name:
"JPEG",
extensions:
[
"jpg",
"jpeg"
]
}
]
}
);

if(
canceled ||
!filePaths?.length
){
return {
ok:
false,
canceled:
true,
...getStatus()
};
}

const result =
processAndStoreLogo(
filePaths[
0
]
);

if(
!result.ok
){
return result;
}

return {
ok:
true,
...getStatus()
};
}catch(
err
){
log.warn(
"desktop:chartSnapshotLogoPick:",
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

ipcMain.handle(
"desktop:chartSnapshotLogoDataUrl",
()=>
getBwDataUrl()
);

}

module.exports =
{
registerChartSnapshotLogoIpc,
getStatus,
hasLogoFiles
};
