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
currentClone
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
stack.push(
baseline
);
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
