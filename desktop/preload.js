const {
contextBridge,
ipcRenderer
} =
require(
"electron"
);

const listeners =
new Set();

ipcRenderer.on(
"desktop:update-status",
(
_event,
payload
)=>{
for(
const fn of
listeners
){
try{
fn(
payload
);
}catch(
err
){
console.warn(
"desktop update listener:",
err
);
}
}
}
);

contextBridge.exposeInMainWorld(
"cryptoTerminalDesktop",
{
isDesktop:
true,
platform:
process.platform,
getVersion:()=>
ipcRenderer.invoke(
"app:getVersion"
),
checkForUpdates:()=>
ipcRenderer.invoke(
"app:checkForUpdates"
),
performUpdate:()=>
ipcRenderer.invoke(
"app:performUpdate"
),
downloadUpdate:()=>
ipcRenderer.invoke(
"app:downloadUpdate"
),
installUpdate:()=>
ipcRenderer.invoke(
"app:installUpdate"
),
onUpdateStatus:(
callback
)=>{
if(
typeof callback !==
"function"
){
return ()=>{};
}
listeners.add(
callback
);
return ()=>{
listeners.delete(
callback
);
};
}
}
);
