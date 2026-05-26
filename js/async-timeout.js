export function withTimeout(
promise,
ms,
label = "operation"
){

return Promise.race([
promise,
new Promise(
(
_,
reject
)=>{
setTimeout(
()=>{
reject(
new Error(
`${label} timeout (${ms}ms)`
)
);
},
ms
);
}
)
]);

}

export function ensureSettled(
promise,
ms,
label = "operation"
){

return withTimeout(
promise,
ms,
label
).catch(err=>{
console.warn(
`[Multichart] ${err?.message || err}`
);
});

}
