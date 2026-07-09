/**
 * Renderer: платформа desktop (.app / .exe).
 * Win-only патчи — js/desktop/win/*, подключать через isDesktopWin().
 */

export function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

export function getDesktopPlatform(){

return String(
window.cryptoTerminalDesktop?.platform ||
""
).trim().toLowerCase();

}

export function isDesktopMac(){

return (
isDesktopShell() &&
getDesktopPlatform() ===
"darwin"
);

}

export function isDesktopWin(){

return (
isDesktopShell() &&
getDesktopPlatform() ===
"win32"
);

}

/**
 * @param {() => Promise<void> | void} loadWinPatch
 */
export async function loadDesktopWinPatch(
loadWinPatch
){

if(
!isDesktopWin() ||
typeof loadWinPatch !==
"function"
){
return;
}

try{
await loadWinPatch();
}catch(
err
){
console.warn(
"[desktop] win patch:",
err
);
}

}
