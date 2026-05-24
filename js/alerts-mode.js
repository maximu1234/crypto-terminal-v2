/** Флаг режима: браузер ловит пересечение или только Railway worker. */

let browserCrossEnabled = true;

export function isBrowserCrossCheckEnabled(){

return browserCrossEnabled;

}

export function setBrowserCrossCheckEnabled(
enabled
){

browserCrossEnabled = !!enabled;

}
