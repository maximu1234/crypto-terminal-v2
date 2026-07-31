/**
 * Версии релиза на Главной и в desktop .app.
 * При новой metka-N: METKA_NUMBER = N (веб → v0.N).
 * При новом desktop: DESKTOP_APP_VERSION (в .app → vX.Y.Z).
 * После 1.0.99 → 1.1.1 (валидный semver; не 1.0.100 и не 1.1.01).
 * Редакция desktop (буква после версии приложения):
 *   f = full (живая + ручная торговля)
 *   m = manual-only (друзья)
 * Источник буквы: desktop/algo-trading-edition.cjs → preload.
 * Формат desktop: «v0.N / vX.Y.Zf» или «v0.N / vX.Y.Zm».
 */
export const METKA_NUMBER =
113;

export const DESKTOP_APP_VERSION =
"1.0.118";

export const RELEASE_VERSION_LABEL =
`v0.${METKA_NUMBER}`;

/**
 * @returns {"f"|"m"|""}
 */
export function getDesktopEditionLetter(){

try{
const desktop =
typeof globalThis !==
"undefined"
? globalThis.window?.cryptoTerminalDesktop
: null;

if(
!desktop?.isDesktop
){
return "";
}

const raw =
desktop.algoDesktopEdition ||
desktop.algoTrading?.edition;
const letter =
String(
raw ||
""
).trim().toLowerCase();

return letter ===
"m"
? "m"
: "f";
}catch{
return "";
}

}

export function getReleaseVersionLabel(){

if(
typeof globalThis !==
"undefined" &&
globalThis.window?.cryptoTerminalDesktop?.isDesktop
){
const edition =
getDesktopEditionLetter();

return `${RELEASE_VERSION_LABEL} / v${DESKTOP_APP_VERSION}${edition}`;
}

return RELEASE_VERSION_LABEL;

}

export function mountReleaseMarker(
root =
document
){

const label =
getReleaseVersionLabel();

root.querySelectorAll(
"[data-release-marker]"
).forEach(
el=>{
el.textContent =
label;
el.removeAttribute(
"aria-hidden"
);
}
);

}

export function ensureHeaderReleaseMarker(
root =
document
){

if(
root.querySelector(
"[data-release-marker]"
)
){
mountReleaseMarker(
root
);
return;
}

if(
root.getElementById(
"header-release-marker"
)
){
mountReleaseMarker(
root
);
return;
}

const mount =
root.querySelector(
".app-header-nav"
) ||
root.querySelector(
"#header-controls.screener-header-desktop"
) ||
root.querySelector(
".screener-header-desktop"
);

if(
!mount
){
return;
}

const el =
root.createElement(
"span"
);
el.id =
"header-release-marker";
el.className =
"screener-release-marker release-marker-header";
el.setAttribute(
"data-release-marker",
""
);
el.setAttribute(
"aria-label",
"Версия"
);
mount.appendChild(
el
);
mountReleaseMarker(
root
);

}
