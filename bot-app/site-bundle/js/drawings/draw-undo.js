/**
 * Undo stack for drawings (Cmd+Z) — session-only, per chart instance.
 */

export function cloneDrawingsForUndo(
drawings,
normalizeDrawingShape
){

return drawings.map(shape=>
normalizeDrawingShape(
JSON.parse(
JSON.stringify(
shape
)
)
)
);

}

export function drawingsUndoSnapshotsEqual(
a,
b
){

if(
a ===
b
){
return true;
}

if(
!a ||
!b ||
a.length !==
b.length
){
return false;
}

return (
JSON.stringify(
a
) ===
JSON.stringify(
b
)
);

}

export function createDrawUndoStack(){

const stack =
[];
let baselineSnapshot =
null;
let replay =
false;

return {

get replay(){
return replay;
},

setReplay(
value
){
replay =
!!value;
},

reset(){

stack.length =
0;
baselineSnapshot =
null;

},

syncBaseline(
clone
){

baselineSnapshot =
clone;

},

recordIfChanged(
currentClone,
options =
{}
){

if(
replay
){
return;
}

const baseline =
baselineSnapshot;

if(
baseline &&
!drawingsUndoSnapshotsEqual(
baseline,
currentClone
)
){

const onPush =
options.onPush;

if(
typeof onPush ===
"function"
){
onPush(
baseline
);
}else{
stack.push(
baseline
);
}

}

baselineSnapshot =
currentClone;

},

canUndo(){
return stack.length >
0;
},

pop(){
return stack.pop();
}

};

}

/**
 * Общий undo (график + RSI): последнее действие на любой панели.
 */
export function createSharedDrawUndoStack(){

const entries =
[];

return {

reset(){

entries.length =
0;

},

canUndo(){

return entries.length >
0;

},

push(
restore
){

if(
typeof restore ===
"function"
){
entries.push(
restore
);
}

},

undo(){

const restore =
entries.pop();

if(
!restore
){
return false;
}

restore();
return true;

}

};

}
