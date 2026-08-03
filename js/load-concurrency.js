/**
 * Shared concurrency limiter for parallel chart/history loads.
 */

/**
 * @param {number} max
 * @returns {{ acquire: () => Promise<void>, release: () => void, max: number }}
 */
export function createConcurrencyLimiter(
max =
4
){

const limit =
Math.max(
1,
Math.floor(
Number(
max
) ||
1
)
);

let inflight =
0;
const waiters =
[];

function acquire(){

if(
inflight <
limit
){
inflight++;
return Promise.resolve();
}

return new Promise(
resolve=>{
waiters.push(
resolve
);
}
).then(
()=>{
inflight++;
}
);

}

function release(){

inflight =
Math.max(
0,
inflight -
1
);

const next =
waiters.shift();

if(
next
){
next();
}

}

return {
acquire,
release,
max:
limit
};

}

/**
 * Run tasks with a concurrency cap. Does not wait for all before returning
 * individual promises — callers may await Promise.all or race first-N.
 * @template T
 * @param {Array<() => Promise<T>>} starters
 * @param {number} max
 * @returns {Promise<T>[]}
 */
export function mapWithConcurrency(
starters,
max =
4
){

const limiter =
createConcurrencyLimiter(
max
);

return starters.map(
start=>
limiter.acquire().then(
async ()=>{
try{
return await start();
}finally{
limiter.release();
}
}
)
);

}
