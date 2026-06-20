/**
 * IPC: trading:* — credentials (фаза 1).
 */
const {
ipcMain
} =
require(
"electron"
);
const log =
require(
"electron-log"
);
const {
getStatus,
saveCredentials,
clearCredentials
} =
require(
"./credentials.cjs"
);

function registerTradingIpc(){

ipcMain.handle(
"trading:getStatus",
()=>{
return getStatus();
}
);

ipcMain.handle(
"trading:saveKeys",
(
_event,
payload
)=>{

try{
saveCredentials(
payload ||
{}
);
return {
ok:
true,
...getStatus()
};
}catch(
err
){
log.warn(
"trading:saveKeys:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

ipcMain.handle(
"trading:clearKeys",
()=>{

try{
clearCredentials();
return {
ok:
true,
...getStatus()
};
}catch(
err
){
log.warn(
"trading:clearKeys:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

}

module.exports =
{
registerTradingIpc
};
