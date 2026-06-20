/**
 * Прогрев HTTP-кэша Electron-сессии (только desktop).
 * Парсит index/coins HTML и подтягивает js/css до первого листания.
 */
const {
net
} =
require(
"electron"
);

const WARM_PAGES =
[
"/index.html",
"/coins.html"
];

const MAX_ASSETS =
56;

const MAX_CONCURRENT =
10;

const ASSET_RE =
/(?:src|href)=["']([^"']+\.(?:js|css|mjs))(?:\?[^"']*)?["']/gi;

function resolveUrl(
base,
ref
){

try{
return new URL(
ref,
base
).href;
}catch{
return null;
}

}

function netGet(
session,
url,
timeoutMs =
20000
){

return new Promise(
(
resolve,
reject
)=>{

const req =
net.request({
url,
session,
redirect:
"follow"
});

const chunks =
[];
const timer =
setTimeout(
()=>{
req.abort();
reject(
new Error(
"timeout"
)
);
},
timeoutMs
);

req.on(
"response",
res=>{
res.on(
"data",
chunk=>{
chunks.push(
chunk
);
}
);
res.on(
"end",
()=>{
clearTimeout(
timer
);
resolve(
Buffer.concat(
chunks
).toString(
"utf8"
)
);
}
);
res.on(
"error",
err=>{
clearTimeout(
timer
);
reject(
err
);
}
);
}
);

req.on(
"error",
err=>{
clearTimeout(
timer
);
reject(
err
);
}
);

req.end();

}
);

}

function netFetchBody(
session,
url,
timeoutMs =
15000
){

return new Promise(
resolve=>{

const req =
net.request({
url,
method:
"GET",
session,
redirect:
"follow"
});

const timer =
setTimeout(
()=>{
req.abort();
resolve(
false
);
},
timeoutMs
);

req.on(
"response",
res=>{
res.on(
"data",
()=>{}
);
res.on(
"end",
()=>{
clearTimeout(
timer
);
resolve(
true
);
}
);
res.on(
"error",
()=>{
clearTimeout(
timer
);
resolve(
false
);
}
);
}
);

req.on(
"error",
()=>{
clearTimeout(
timer
);
resolve(
false
);
}
);

req.end();

}
);

}

async function mapPool(
items,
limit,
fn
){

let cursor =
0;

async function worker(){

while(
cursor <
items.length
){

const index =
cursor++;
await fn(
items[
index
],
index
);
}

}

await Promise.all(
Array.from(
{
length:
Math.min(
limit,
Math.max(
items.length,
1
)
)
},
()=>
worker()
)
);

}

function collectAssetUrls(
html,
pageUrl
){

const urls =
new Set();
let match;

ASSET_RE.lastIndex =
0;

while(
(
match =
ASSET_RE.exec(
html
)
) !==
null
){

const abs =
resolveUrl(
pageUrl,
match[
1
]
);

if(
abs
){
urls.add(
abs
);
}

}

return urls;

}

async function warmStaticCache(
session,
appUrl
){

const base =
appUrl.replace(
/\/$/,
""
);
const origin =
new URL(
base
).origin;
const assets =
new Set();

assets.add(
`${origin}/vendor/lightweight-charts.standalone.production.js`
);

for(
const page of
WARM_PAGES
){

try{

const pageUrl =
`${base}${page}`;
const html =
await netGet(
session,
pageUrl
);

for(
const url of
collectAssetUrls(
html,
pageUrl
)
){
assets.add(
url
);
}

}catch{
/* страница недоступна — пропускаем */
}

}

const list =
[
...assets
].slice(
0,
MAX_ASSETS
);

await mapPool(
list,
MAX_CONCURRENT,
url=>
netFetchBody(
session,
url
)
);

return list.length;

}

module.exports =
{
warmStaticCache
};
