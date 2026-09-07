/**
 * Windows-only: корректный кроп скриншота графика.
 * capturePage(rect) на Win часто захватывает лишнее из‑за DPI —
 * берём весь viewport и режем NativeImage по DIP→physical.
 *
 * Качество: CDP Page.captureScreenshot(fromSurface) — пиксели compositor
 * (как на экране). Без апскейла. Если CDP недоступен — fallback capturePage().
 */
"use strict";

const {
BrowserWindow,
nativeImage
} =
require(
"electron"
);
const log =
require(
"electron-log"
);

function clampCrop(
crop,
imageSize
){

const x =
Math.max(
0,
Math.min(
crop.x,
imageSize.width -
1
)
);
const y =
Math.max(
0,
Math.min(
crop.y,
imageSize.height -
1
)
);
const width =
Math.max(
1,
Math.min(
crop.width,
imageSize.width -
x
)
);
const height =
Math.max(
1,
Math.min(
crop.height,
imageSize.height -
y
)
);

return {
x,
y,
width,
height
};

}

function imageFromPngBase64(
b64
){

if(
!b64
){
return null;
}

try{
const image =
nativeImage.createFromBuffer(
Buffer.from(
b64,
"base64"
)
);

if(
!image ||
image.isEmpty()
){
return null;
}

return image;
}catch{
return null;
}

}

/**
 * Viewport в пикселях compositor (без clip.scale — не растягиваем растр).
 * @param {Electron.WebContents} wc
 * @returns {Promise<Electron.NativeImage|null>}
 */
async function captureViewportSurfaceCdp(
wc
){

const dbg =
wc?.debugger;

if(
!dbg ||
typeof dbg.sendCommand !==
"function" ||
typeof dbg.attach !==
"function"
){
return null;
}

let attachedByUs =
false;

try{
if(
typeof dbg.isAttached ===
"function" &&
!dbg.isAttached()
){
dbg.attach(
"1.3"
);
attachedByUs =
true;
}

const result =
await dbg.sendCommand(
"Page.captureScreenshot",
{
format:
"png",
fromSurface:
true,
captureBeyondViewport:
false
}
);

return imageFromPngBase64(
result?.data
);
}catch(
err
){
log.warn(
"chart-snapshot-win CDP:",
err?.message ||
err
);
return null;
}finally{
if(
attachedByUs &&
typeof dbg.detach ===
"function"
){
try{
dbg.detach();
}catch{
/* ignore */
}

}

}

}

/**
 * @param {Electron.WebContents} wc
 * @param {{ x: number, y: number, width: number, height: number }} dipRect
 * @returns {Promise<{ ok: true, image: Electron.NativeImage } | { ok: false, error: string }>}
 */
async function captureChartAreaWin(
wc,
dipRect
){

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

const win =
BrowserWindow.fromWebContents(
wc
);

const contentSize =
typeof win?.getContentSize ===
"function"
? win.getContentSize()
: null;

const contentW =
Number(
contentSize?.[
0
]
);
const contentH =
Number(
contentSize?.[
1
]
);

let full =
await captureViewportSurfaceCdp(
wc
);

if(
!full
){
full =
await wc.capturePage();
}

if(
!full ||
full.isEmpty()
){
return {
ok:
false,
error:
"Пустой скриншот"
};
}

const imageSize =
full.getSize();

if(
!Number.isFinite(
contentW
) ||
!Number.isFinite(
contentH
) ||
contentW <
1 ||
contentH <
1
){
return {
ok:
true,
image:
full
};
}

const scaleX =
imageSize.width /
contentW;
const scaleY =
imageSize.height /
contentH;

const crop =
clampCrop(
{
x:
Math.round(
dipRect.x *
scaleX
),
y:
Math.round(
dipRect.y *
scaleY
),
width:
Math.round(
dipRect.width *
scaleX
),
height:
Math.round(
dipRect.height *
scaleY
)
},
imageSize
);

const image =
full.crop(
crop
);

if(
!image ||
image.isEmpty()
){
return {
ok:
false,
error:
"Пустой кроп скриншота"
};
}

return {
ok:
true,
image
};

}

module.exports =
{
captureChartAreaWin
};
