/**
 * Windows-only: корректный кроп скриншота графика.
 * capturePage(rect) на Win часто захватывает лишнее из‑за DPI —
 * берём весь viewport и режем NativeImage по CSS→bitmap.
 *
 * Масштаб — от CSS-вьюпорта страницы (LayoutMetrics / innerWidth),
 * не от BrowserWindow.getContentSize(): после CDP fromSurface размер
 * картинки совпадает с CSS, а getContentSize на Win часто меньше
 * (DPI) — кроп раздувается вправо на список монет и Позиции.
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

function isValidSize(
size
){

const width =
Number(
size?.width
);
const height =
Number(
size?.height
);

return (
Number.isFinite(
width
) &&
Number.isFinite(
height
) &&
width >=
1 &&
height >=
1
);

}

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

/**
 * dipRect — CSS (getBoundingClientRect). imageSize — пиксели снимка.
 * viewportSize — тот же CSS-вьюпорт, что и у rect (не getContentSize).
 */
function scaleDipRectToImage(
dipRect,
imageSize,
viewportSize
){

const vp =
isValidSize(
viewportSize
)
? viewportSize
: imageSize;

const scaleX =
imageSize.width /
vp.width;
const scaleY =
imageSize.height /
vp.height;

const x1 =
Math.round(
dipRect.x *
scaleX
);
const y1 =
Math.round(
dipRect.y *
scaleY
);
const x2 =
Math.round(
(
dipRect.x +
dipRect.width
) *
scaleX
);
const y2 =
Math.round(
(
dipRect.y +
dipRect.height
) *
scaleY
);

return clampCrop(
{
x:
x1,
y:
y1,
width:
Math.max(
1,
x2 -
x1
),
height:
Math.max(
1,
y2 -
y1
)
},
imageSize
);

}

function cssViewportFromLayoutMetrics(
metrics
){

const visual =
metrics?.cssVisualViewport;
const layout =
metrics?.cssLayoutViewport;
const width =
Number(
visual?.clientWidth ||
layout?.clientWidth
);
const height =
Number(
visual?.clientHeight ||
layout?.clientHeight
);

if(
!isValidSize(
{
width,
height
}
)
){
return null;
}

return {
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
 * @returns {Promise<{ image: Electron.NativeImage, cssViewport: { width: number, height: number } | null } | null>}
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

let cssViewport =
null;

try{
cssViewport =
cssViewportFromLayoutMetrics(
await dbg.sendCommand(
"Page.getLayoutMetrics"
)
);
}catch{
cssViewport =
null;
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

const image =
imageFromPngBase64(
result?.data
);

if(
!image
){
return null;
}

return {
image,
cssViewport
};
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

async function readCssViewportFromRenderer(
wc
){

if(
typeof wc?.executeJavaScript !==
"function"
){
return null;
}

try{
const value =
await wc.executeJavaScript(
"({width:Math.round((window.visualViewport&&window.visualViewport.width)||window.innerWidth),height:Math.round((window.visualViewport&&window.visualViewport.height)||window.innerHeight)})",
true
);

if(
!isValidSize(
value
)
){
return null;
}

return {
width:
Number(
value.width
),
height:
Number(
value.height
)
};
}catch{
return null;
}

}

function contentSizeToViewport(
contentSize
){

const width =
Number(
contentSize?.[
0
]
);
const height =
Number(
contentSize?.[
1
]
);

if(
!isValidSize(
{
width,
height
}
)
){
return null;
}

return {
width,
height
};

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

const contentViewport =
contentSizeToViewport(
typeof win?.getContentSize ===
"function"
? win.getContentSize()
: null
);

let full =
null;
let cssViewport =
null;
const cdp =
await captureViewportSurfaceCdp(
wc
);

if(
cdp?.image
){
full =
cdp.image;
cssViewport =
cdp.cssViewport;
}

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

if(
!cssViewport
){
cssViewport =
await readCssViewportFromRenderer(
wc
);
}

const imageSize =
full.getSize();
const crop =
scaleDipRectToImage(
dipRect,
imageSize,
cssViewport ||
contentViewport
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
captureChartAreaWin,
clampCrop,
cssViewportFromLayoutMetrics,
scaleDipRectToImage
};
