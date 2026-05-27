/**
 * Показывает страницу только после загрузки таблиц стилей (убирает «поломанный» первый кадр).
 */
(function(){

const root =
document.documentElement;

function markReady(){

root.classList.add(
"css-ready"
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

if(
!pending
){
markReady();
return;
}

function oneDone(){

pending -= 1;

if(
pending <=
0
){
markReady();
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
/* cross-origin */
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

setTimeout(
markReady,
4500
);

})();
