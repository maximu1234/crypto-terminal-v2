/** @module drawings/position */
export function isPositionType(type){

return type === "long" || type === "short";

}

export function positionEntryPrice(shape){

return Number(shape.p1?.price);

}

