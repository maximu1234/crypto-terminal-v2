/** @module drawings/utils */
export function pickUi(uiRoot, id, className){

if(uiRoot){
return uiRoot.querySelector(className);
}

return document.getElementById(id);

}
