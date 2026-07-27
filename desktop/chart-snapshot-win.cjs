/**
 * Windows-only: корректный кроп скриншота графика.
 * capturePage(rect) на Win часто захватывает лишнее из‑за DPI —
 * берём весь viewport и режем NativeImage по DIP→physical.
 */
"use strict";

const {
BrowserWindow
} =
require(
"electron"
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

const full =
await wc.capturePage();

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
