import {
loadBybitSymbols
} from "./api.js?v=19";

let symbolsCache = null;

let symbolsPromise = null;

export function preloadTradingSymbols(){

if(!symbolsPromise){

symbolsPromise =
loadBybitSymbols()
.then(list=>{

symbolsCache =
list
.map(x => x.symbol)
.sort((a, b)=>a.localeCompare(b));

return symbolsCache;

})
.catch(err=>{

console.error("Symbols preload:", err);

symbolsCache = [];

return symbolsCache;

});

}

return symbolsPromise;

}

function filterSymbols(query, limit = 12){

const q =
query.trim().toUpperCase();

if(!q || !symbolsCache?.length){
return [];
}

return symbolsCache
.filter(sym=>sym.includes(q))
.slice(0, limit);

}

export function attachSymbolAutocomplete(
input,
{
onCommit,
maxItems = 12
} = {}
){

const wrap =
document.createElement("div");

wrap.className = "symbol-search-wrap";

input.parentNode.insertBefore(wrap, input);
wrap.appendChild(input);

input.setAttribute("autocomplete", "off");

const list =
document.createElement("div");

list.className = "symbol-suggestions hidden";
list.setAttribute("role", "listbox");

wrap.appendChild(list);

let matches = [];
let highlightIndex = -1;
let committed =
input.value.trim().toUpperCase();

function hideList(){

list.classList.add("hidden");
list.innerHTML = "";
matches = [];
highlightIndex = -1;

}

function positionList(){

const rect =
input.getBoundingClientRect();

list.style.position = "fixed";
list.style.left = `${rect.left}px`;
list.style.top = `${rect.top + rect.height + 4}px`;
list.style.width = `${Math.max(rect.width, 140)}px`;

}

function renderList(items){

list.innerHTML = "";

if(!items.length){
hideList();
return;
}

positionList();

items.forEach((sym, index)=>{

const btn =
document.createElement("button");

btn.type = "button";
btn.className = "symbol-suggestion-item";
btn.setAttribute("role", "option");
btn.textContent = sym;

if(index === highlightIndex){
btn.classList.add("highlighted");
}

btn.addEventListener("mousedown", e=>{
e.preventDefault();
pick(sym);
});

list.appendChild(btn);

});

list.classList.remove("hidden");

}

function pick(sym){

const value =
sym.trim().toUpperCase();

input.value = value;
committed = value;
hideList();
onCommit?.(value);

}

function refreshMatches(){

matches =
filterSymbols(input.value, maxItems);

highlightIndex =
matches.length ? 0 : -1;

renderList(matches);

}

input.addEventListener("focus", ()=>{

const q =
input.value.trim();

if(q && q !== committed){
refreshMatches();
}

});

input.addEventListener("input", ()=>{

refreshMatches();

});

input.addEventListener("keydown", e=>{

const listOpen =
!list.classList.contains("hidden") &&
matches.length;

if(
listOpen &&
e.key === "ArrowDown"
){

e.preventDefault();

highlightIndex =
(highlightIndex + 1) % matches.length;

renderList(matches);

return;

}

if(
listOpen &&
e.key === "ArrowUp"
){

e.preventDefault();

highlightIndex =
(highlightIndex - 1 + matches.length) % matches.length;

renderList(matches);

return;

}

if(e.key === "Escape"){

hideList();

input.value = committed;

return;

}

if(e.key === "Enter"){

e.preventDefault();

if(
listOpen &&
highlightIndex >= 0
){

pick(matches[highlightIndex]);

return;

}

const typed =
input.value.trim().toUpperCase();

if(!typed){
input.value = committed;
return;
}

if(
symbolsCache?.includes(typed)
){
pick(typed);
return;
}

if(matches.length){
pick(matches[0]);

return;
}

committed = typed;
hideList();
onCommit?.(typed);

}

});

input.addEventListener("blur", ()=>{

setTimeout(()=>{

hideList();

const typed =
input.value.trim().toUpperCase();

if(
typed &&
symbolsCache?.includes(typed)
){

if(typed !== committed){
pick(typed);
}

return;
}

input.value = committed;

}, 120);

});

preloadTradingSymbols().then(()=>{

if(
document.activeElement === input &&
input.value.trim() &&
input.value.trim().toUpperCase() !== committed
){
refreshMatches();
}

});

}
