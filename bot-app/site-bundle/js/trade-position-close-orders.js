/**
 * Auto order cleanup on position close (desktop trade).
 * Cancel reduce-only orders left on chart after position is closed.
 */

function normalizeSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function isActivePosition(
row
){

if(
!row
){
return false;
}

const size =
Number(
row?.size
);

return Number.isFinite(
size
) &&
size >
0 &&
String(
row?.side ||
""
).trim() !==
"";

}

const reconcileInflight =
new Set();

export function maybeReconcileOrdersOnPositionClose(
symbol,
prevPosition
){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return;
}

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

if(
!symbol ||
!prevPosition
){
return;
}

const sym =
normalizeSymbol(
symbol
);

if(
!sym ||
!isActivePosition(
prevPosition
)
){
return;
}

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.reconcileOrdersOnPositionClose
){
return;
}

if(
reconcileInflight.has(
sym
)
){
return;
}

reconcileInflight.add(
sym
);

void (
async()=>{

try{
await new Promise(
resolve=>{
setTimeout(
resolve,
200
);
}
);

const result =
await api.reconcileOrdersOnPositionClose(
sym
);

if(
result?.ok ===
false
){
console.warn(
"[trade-position-close-orders]",
sym,
result.message ||
"reconcile failed"
);
return;
}

if(
result?.canceled
){
console.debug(
"[trade-position-close-orders]",
sym,
`canceled=${result.canceled || 0}`
);

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
window.dispatchEvent(
new CustomEvent(
"trade-orders-refresh"
)
);
}

if(
Array.isArray(
result?.errors
) &&
result.errors.length
){
console.warn(
"[trade-position-close-orders]",
sym,
result.errors
);
}
}catch(
err
){
console.warn(
"[trade-position-close-orders]",
sym,
err?.message ||
err
);
}finally{
setTimeout(
()=>{
reconcileInflight.delete(
sym
);
},
3000
);
}

}
)();

}
