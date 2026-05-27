/** Ждёт site-css-ready.js перед стартом страничных модулей. */
export function waitForSiteCssReady(){

if(
typeof window.waitForSiteCssReady ===
"function"
){
return window.waitForSiteCssReady();
}

if(
document.documentElement.classList.contains(
"css-ready"
)
){
return Promise.resolve();
}

return new Promise(
resolve=>{
const timer =
setTimeout(
resolve,
5000
);

window.addEventListener(
"site-css-ready",
()=>{
clearTimeout(
timer
);
resolve();
},
{ once: true }
);
}
);

}
