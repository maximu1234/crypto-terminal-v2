/**
 * Звуки исполнения позиции (открытие / закрытие), не выставление ордеров.
 */
const OPEN_SOUND_URL =
"/sounds/trade-open-position.mp3";

const CLOSE_SOUND_URL =
"/sounds/trade-close-position.mp3";

let openAudio =
null;
let closeAudio =
null;
let audioUnlocked =
false;
let unlockListenersBound =
false;
let soundsSeeded =
false;

function unlockAudioOnGesture(){

if(
audioUnlocked
){
return;
}

try{

const Ctx =
window.AudioContext ||
window.webkitAudioContext;

if(
Ctx
){
const ctx =
new Ctx();

const done =
()=>{
audioUnlocked =
true;
ctx.close().catch(
()=>{}
);
};

const resumed =
ctx.resume();

if(
resumed &&
typeof resumed.then ===
"function"
){
resumed.then(
done
).catch(
()=>{
audioUnlocked =
true;
}
);
}else{
done();
}

return;
}

}catch{
/* ignore */
}

audioUnlocked =
true;

}

function bindUnlockListeners(){

if(
unlockListenersBound
){
return;
}

unlockListenersBound =
true;

for(
const ev of [
"pointerdown",
"touchstart",
"keydown"
]
){

document.addEventListener(
ev,
unlockAudioOnGesture,
{
once:
true,
passive:
true
}
);

}

}

function ensureAudio(
url,
getter,
setter
){

const cached =
getter();

if(
cached
){
return cached;
}

const audio =
new Audio(
url
);

audio.preload =
"auto";

setter(
audio
);

return audio;

}

function ensureOpenAudio(){

return ensureAudio(
OPEN_SOUND_URL,
()=>
openAudio,
audio=>{
openAudio =
audio;
}
);

}

function ensureCloseAudio(){

return ensureAudio(
CLOSE_SOUND_URL,
()=>
closeAudio,
audio=>{
closeAudio =
audio;
}
);

}

function playAudio(
audio
){

if(
!audio
){
return;
}

try{

if(
!audioUnlocked
){
unlockAudioOnGesture();
}

audio.currentTime =
0;

const play =
audio.play();

if(
play &&
typeof play.catch ===
"function"
){
play.catch(
()=>{}
);
}

}catch{
/* ignore */
}

}

export function shouldPlayTradePositionSounds(){

return soundsSeeded;

}

export function markTradePositionSoundsSeeded(){

soundsSeeded =
true;

}

export function playTradePositionOpenSound(){

playAudio(
ensureOpenAudio()
);

}

export function playTradePositionCloseSound(){

playAudio(
ensureCloseAudio()
);

}

export function initTradePositionSounds(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return;
}

bindUnlockListeners();
ensureOpenAudio();
ensureCloseAudio();

}
