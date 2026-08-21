/**
 * Chromium session partition for the Multichart window.
 * Renderer traffic and Terminal REST (net.fetch) share this session
 * so desktop proxy settings apply. Algo REST stays on defaultSession.
 */
"use strict";

const APP_SESSION_PARTITION =
"persist:multichart-desktop";

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
