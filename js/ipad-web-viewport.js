/**
 * iPad website only — not Multichart.app, not desktop Safari.
 * Used by Screener zoom; do not import from desktop-only pages.
 */

function isDesktopShellRuntime(){

return !!globalThis.window?.cryptoTerminalDesktop?.isDesktop;

}

/** iPad / iPadOS, including Safari «desktop site» (MacIntel + touch). */
export function isIpadDeviceViewport(){

if(
typeof navigator ===
"undefined" ||
typeof document ===
"undefined"
){
return false;
}

const ua =
navigator.userAgent ||
"";

if(
/iPad/i.test(
ua
)
){
return true;
}

const maxTouch =
Number(
navigator.maxTouchPoints
) ||
0;

if(
maxTouch <
2
){
return false;
}

/* iPadOS 13+: Safari reports Macintosh / MacIntel, including «desktop site». */
if(
/Macintosh|Mac OS X/i.test(
ua
) ||
navigator.platform ===
"MacIntel"
){
return true;
}

return false;

}

export function isIpadWebViewport(){

return !isDesktopShellRuntime() &&
isIpadDeviceViewport();

}
