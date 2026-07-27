const {
contextBridge,
ipcRenderer
} =
require(
"electron"
);

contextBridge.exposeInMainWorld(
"trayPopup",
{
onState(
callback
){

if(
typeof callback !==
"function"
){
return ()=>{};
}

const handler =
(
_event,
state
)=>{
callback(
state ||
{}
);
};

ipcRenderer.on(
"tray-popup:state",
handler
);

return ()=>{
ipcRenderer.removeListener(
"tray-popup:state",
handler
);
};

},
resize(
height
){

const num =
Number(
height
);

if(
!Number.isFinite(
num
) ||
num <=
0
){
return;
}

ipcRenderer.send(
"tray-popup:resize",
Math.round(
num
)
);

},
openApp(){

ipcRenderer.send(
"tray-popup:open-app"
);

},
quit(){

ipcRenderer.send(
"tray-popup:quit"
);

},
togglePnlHidden(){

ipcRenderer.send(
"tray-popup:toggle-pnl-hidden"
);

}
}
);
