/**
 * Версии релиза на Главной и в desktop .app.
 * При новой metka-N: METKA_NUMBER = N (веб → v0.N).
 * При новом desktop: DESKTOP_APP_VERSION (в .app → vX.Y.Z).
 * В desktop подпись: «v0.N / vX.Y.Z» (сначала веб, потом приложение).
 */
export const METKA_NUMBER =
54;

export const DESKTOP_APP_VERSION =
"1.0.47";

export const RELEASE_VERSION_LABEL =
`v0.${METKA_NUMBER}`;

export function getReleaseVersionLabel(){

if(
typeof globalThis !==
"undefined" &&
globalThis.window?.cryptoTerminalDesktop?.isDesktop
){
return `${RELEASE_VERSION_LABEL} / v${DESKTOP_APP_VERSION}`;
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
".coins-header-desktop"
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
