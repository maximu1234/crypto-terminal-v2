/** @module drawings/position */
import {
POSITION_SCALE_ENTRY_BG,
POSITION_SCALE_SL_BG,
POSITION_SCALE_TP_BG
} from "./constants.js?v=9";

export function isPositionType(type){

return type === "long" || type === "short";

}

export function positionEntryPrice(shape){

return Number(shape.p1?.price);

}

export function positionScaleLabelColor(
handleId
){

if(
handleId ===
"tp"
){
return POSITION_SCALE_TP_BG;
}

if(
handleId ===
"sl"
){
return POSITION_SCALE_SL_BG;
}

return POSITION_SCALE_ENTRY_BG;

}

