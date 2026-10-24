"use strict";

const DEPTH_FLUSH_MS = 100;

/**
 * Склеивает дельты стакана и отдаёт их пачкой.
 * Снапшот сбрасывает всё, что пришло раньше него.
 * @param {(messages: {type: string, data: unknown}[]) => void} emit
 */
function createDepthBatcher(emit){

let batch = [];
let timer = null;

function flush(){

if(timer){
clearTimeout(timer);
timer = null;
}

if(!batch.length){
return;
}

const messages = batch;
batch = [];
emit(messages);

}

function push(msg){

if(
!msg ||
msg.op === "pong" ||
msg.op === "ping" ||
msg.op === "subscribe" ||
msg.op === "unsubscribe"
){
return false;
}

const row = {
type: msg.type === "snapshot" ? "snapshot" : "delta",
data: msg.data
};

if(row.type === "snapshot"){
batch = [row];
}else{
batch.push(row);
}

if(!timer){
timer = setTimeout(flush, DEPTH_FLUSH_MS);
if(typeof timer.unref === "function"){
timer.unref();
}
}

return true;

}

function stop(){

if(timer){
clearTimeout(timer);
timer = null;
}

batch = [];

}

return {
push,
flush,
stop
};

}

module.exports = {
DEPTH_FLUSH_MS,
createDepthBatcher
};
