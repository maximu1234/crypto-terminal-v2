/**
 * Показывает страницу после применения CSS (проверка computed style, не только onload).
 */
(function(){

const root =
document.documentElement;
let done =
false;

function markReady(){

if(
done
){
return;
}

done =
true;

root.classList.add(
"css-ready"
);

window.dispatchEvent(
new Event(
"site-css-ready"
)
);

}

function stylesLookApplied(){

const header =
document.getElementById(
"header"
);

if(
header
){
const bg =
getComputedStyle(
header
).backgroundColor;
if(
bg ===
"rgba(0, 0, 0, 0)" ||
bg ===
"transparent"
){
return false;
}
}

const hiddenDropdown =
document.querySelector(
".header-settings-dropdown.hidden"
);

if(
hiddenDropdown
){
const display =
getComputedStyle(
hiddenDropdown
).display;
if(
display !==
"none"
){
return false;
}
}

return true;

}

function finishAfterPaint(
attempt
){

requestAnimationFrame(
()=>{

requestAnimationFrame(
()=>{

if(
stylesLookApplied()
){
markReady();
return;
}

if(
attempt <
60
){
setTimeout(
()=>{
finishAfterPaint(
attempt +
1
);
},
50
);
return;
}

markReady();

}
);

}
);

}

const sheets =
Array.from(
document.querySelectorAll(
'link[rel="stylesheet"]'
)
).filter(
link=>{
const href =
String(
link.href ||
""
);
return !href.includes(
"critical-shell.css"
);
}
);

let pending =
sheets.length;

function sheetsDone(){

finishAfterPaint(
0
);

}

if(
!pending
){
sheetsDone();
}else{

function oneDone(){

pending -=
1;

if(
pending <=
0
){
sheetsDone();
}

}

sheets.forEach(
link=>{

try{
if(
link.sheet
){
oneDone();
return;
}
}catch{
/* ignore */
}

link.addEventListener(
"load",
oneDone,
{ once: true }
);

link.addEventListener(
"error",
oneDone,
{ once: true }
);

}
);

}

setTimeout(
markReady,
6000
);

window.waitForSiteCssReady =
function waitForSiteCssReady(){

if(
root.classList.contains(
"css-ready"
)
){
return Promise.resolve();
}

return new Promise(
resolve=>{
window.addEventListener(
"site-css-ready",
()=>{
resolve();
},
{ once: true }
);
}
);

};

window.addEventListener(
"pageshow",
e=>{

if(
e.persisted &&
!stylesLookApplied()
){
location.reload();
}

}
);

})();
