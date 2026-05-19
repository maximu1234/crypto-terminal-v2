export function saveWidgetState(index, symbol, tf){

const state = {

symbol,
tf

};

localStorage.setItem(
`widget_${index}`,
JSON.stringify(state)
);

}

export function loadWidgetState(index){

const raw =
localStorage.getItem(
`widget_${index}`
);

if(!raw){
return null;
}

try{

return JSON.parse(raw);

}catch{

return null;

}

}

export function saveFavorites(favorites){

localStorage.setItem(
"favorites",
JSON.stringify(favorites)
);

}

export function loadFavorites(){

try{

return JSON.parse(
localStorage.getItem("favorites") || "[]"
);

}catch{

return [];

}

}

export function saveLayout(layout){

localStorage.setItem(
"dashboard_layout",
layout
);

}

export function loadLayout(){

return Number(
localStorage.getItem("dashboard_layout")
) || 9;

}
