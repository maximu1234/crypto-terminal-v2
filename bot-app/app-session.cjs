/**
 * Chromium session partition for the standalone Algo Bot window.
 * Renderer fetch (ticker list) and algo REST net.fetch share this session
 * so SOCKS from Настройки → Прокси applies. Do not copy desktop's
 * persist:multichart-desktop — that partition is unused here.
 */
"use strict";

const APP_SESSION_PARTITION =
"persist:multichart-algo-bot";

function getRendererProxySession(){

try{
const {
session
} =
require(
"electron"
);

if(
!session ||
typeof session.fromPartition !==
"function"
){
return undefined;
}

return session.fromPartition(
APP_SESSION_PARTITION
);
}catch{
return undefined;
}

}

module.exports =
{
APP_SESSION_PARTITION,
getRendererProxySession
};
