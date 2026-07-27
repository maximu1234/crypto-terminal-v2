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

export async function fetchWithTimeout(
url,
options,
ms = 12000
){

const controller =
new AbortController();

const timer =
setTimeout(
()=>{
controller.abort();
},
ms
);

try{
return await fetch(
url,
{
...options,
signal: controller.signal
}
);
}finally{
clearTimeout(
timer
);
}

}
