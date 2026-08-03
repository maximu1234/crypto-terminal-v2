/**
 * Multichart desktop stub: LAN session-log server may call these.
 * Full worker WS remote-control lives only in bot-app/trading/.
 */
const os =
require(
"os"
);
const {
app
} =
require(
"electron"
);
const algoBot =
require(
"./algo-trading-bot.cjs"
);

function getLanBotStatus(){

const st =
algoBot.getBotStatus?.() ||
{};

return {
ok:
true,
online:
true,
running:
!!st.running,
host:
os.hostname(),
app:
app.getName?.() ||
"Multichart",
instanceId:
null,
lastSeenAt:
new Date().toISOString(),
via:
"lan"
};

}

async function handleCommand(
action
){

const act =
String(
action ||
""
).trim().toLowerCase();

if(
act ===
"start"
){
return algoBot.startBot(
{
strategyId:
"st1"
}
);
}

if(
act ===
"stop"
){
const st =
algoBot.getBotStatus?.() ||
{};

return algoBot.stopBot(
{
strategyId:
st.strategyId ||
"st1"
}
);
}

return {
ok:
false,
error:
"bad_action",
message:
"action must be start or stop"
};

}

function notifyAuthSessionChanged(){
/* no worker WS on Multichart desktop */
}

module.exports =
{
handleCommand,
getLanBotStatus,
notifyAuthSessionChanged,
startRemoteControl:()=>({
ok:
false,
skipped:
true
}),
stopRemoteControl:()=>({
ok:
true
}),
getRemoteControlStatus:()=>({
started:
false,
connected:
false,
bot:
getLanBotStatus()
}),
sendStatus:()=>{},
buildStatusPayload:()=>
getLanBotStatus()
};
