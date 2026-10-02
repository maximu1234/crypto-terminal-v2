/**
 * IndexedDB backend for drawings JSON blobs (PERF phase 5).
 * Values are raw strings (same as localStorage). Failures fall through
 * to the KV facade — never block candles / alerts.
 */

const DB_NAME =
"multichart_drawings_v1";

const DB_VERSION =
1;

const STORE =
"kv";

/** @type {Promise<IDBDatabase>|null} */
let dbPromise =
null;

function openDb(){

if(
dbPromise
){
return dbPromise;
}

if(
typeof indexedDB ===
"undefined"
){
return Promise.reject(
new Error(
"indexedDB unavailable"
)
);
}

dbPromise =
new Promise(
(resolve, reject)=>{

const req =
indexedDB.open(
DB_NAME,
DB_VERSION
);

req.onupgradeneeded =
()=>{

const db =
req.result;

if(
!db.objectStoreNames.contains(
STORE
)
){
db.createObjectStore(
STORE
);
}

};

req.onsuccess =
()=>
resolve(
req.result
);

req.onerror =
()=>{
dbPromise =
null;
reject(
req.error ||
new Error(
"indexedDB open failed"
)
);
};

}
);

return dbPromise;

}

/**
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function drawingsIdbGet(
key
){

const db =
await openDb();

return new Promise(
(resolve, reject)=>{

const tx =
db.transaction(
STORE,
"readonly"
);
const req =
tx.objectStore(
STORE
).get(
key
);

req.onsuccess =
()=>{

const v =
req.result;

resolve(
typeof v ===
"string"
? v
: null
);

};

req.onerror =
()=>
reject(
req.error
);

}
);

}

/**
 * @param {string} key
 * @param {string} value
 */
export async function drawingsIdbSet(
key,
value
){

const db =
await openDb();

return new Promise(
(resolve, reject)=>{

const tx =
db.transaction(
STORE,
"readwrite"
);

tx.objectStore(
STORE
).put(
value,
key
);

tx.oncomplete =
()=>
resolve();

tx.onerror =
()=>
reject(
tx.error
);

}
);

}

/**
 * @param {string} key
 */
export async function drawingsIdbDelete(
key
){

const db =
await openDb();

return new Promise(
(resolve, reject)=>{

const tx =
db.transaction(
STORE,
"readwrite"
);

tx.objectStore(
STORE
).delete(
key
);

tx.oncomplete =
()=>
resolve();

tx.onerror =
()=>
reject(
tx.error
);

}
);

}

/**
 * @returns {Promise<Map<string, string>>}
 */
export async function drawingsIdbGetAll(){

const db =
await openDb();

return new Promise(
(resolve, reject)=>{

const tx =
db.transaction(
STORE,
"readonly"
);
const req =
tx.objectStore(
STORE
).openCursor();
const out =
new Map();

req.onsuccess =
()=>{

const cursor =
req.result;

if(
!cursor
){
resolve(
out
);
return;
}

if(
typeof cursor.key ===
"string" &&
typeof cursor.value ===
"string"
){
out.set(
cursor.key,
cursor.value
);
}

cursor.continue();

};

req.onerror =
()=>
reject(
req.error
);

}
);

}

export function drawingsIdbAvailable(){

return typeof indexedDB !==
"undefined";

}
