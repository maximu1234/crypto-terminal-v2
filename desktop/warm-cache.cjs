/**
 * Прогрев HTTP-кэша Electron-сессии (только desktop).
 * 1) manifest с сервера → точные ?v= для chart/coins
 * 2) phase1 (critical) блокирует окно, phase2 — фон
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const {
net
} =
require(
"electron"
);

const WARM_PAGES =
[
"/terminal.html",
"/screener.html"
];

const MAX_PHASE2 =
96;

const MAX_CONCURRENT =
14;

const ASSET_RE =
/(?:src|href)=["']([^"']+\.(?:js|css|mjs))(?:\?[^"']*)?["']/gi;

/** Порядок = приоритет загрузки (график / монеты). */
const MANIFEST_PRIORITY =
[
"asset-manifest.js",
"site-css-gate.js",
"charts-lib-boot.js",
"terminal-page-boot.js",
"chart-page.js",
"terminal.js",
"chart.js",
"chart-import.js",
"chart-widget-host.js",
"bybit-fetch.js",
"bybit-route-pref.js",
"bybit-network-ui.js",
"drawings.js",
"drawings/init.js",
"chart/chart-factory.js",
"chart/chart-options.js",
"chart/chart-dom-crosshair.js",
"cloud-sync.js",
"supabase-client.js",
"auth-ui.js",
"site-boot.js",
"critical-shell.css",
"common.css",
"terminal.css",
"terminal-layout.css",
"watchlist.css"
];

const CHART_KEY_RE =
/^(chart|terminal|drawings|coins|bybit|dashboard|widget|chart-|coins-|site-css|alert-auth|cloud-sync|supabase|favorites|drawings-cloud|device-pull|ticker-update|page-routes|qwerty|charts-lib|chart-import|chart-page|chart-widget|tablet-|price-alert|alert-monitor|site-boot|auth-ui|release-marker|desktop-app|suppress-native|coins-layout|coins-tablet|telegram-bot|async-timeout|auth-storage)/;

const CHART_CSS_RE =
/^(critical-shell|common|terminal|terminal-layout|watchlist|desktop-app)\.css$/;

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

function parseManifestAssets(
src
){

const assets =
{};
const re =
/"([^"]+\.(?:js|css))"\s*:\s*(\d+)/g;
let m;

while(
(
m =
re.exec(
src
)
) !==
null
){
assets[
m[
1
]
] =
parseInt(
m[
2
],
10
);
}

return assets;

}

function readBundledManifestAssets(){

try{
const bundled =
path.join(
__dirname,
"..",
"js",
"asset-manifest.js"
);
const src =
fs.readFileSync(
bundled,
"utf8"
);
const assets =
parseManifestAssets(
src
);

if(
Object.keys(
assets
).length >
10
){
return assets;
}
}catch{
/* packaged .app — manifest только на сервере */
}

return null;

}

async function fetchRemoteManifestAssets(
session,
origin
){

const candidates =
[
`${origin}/js/asset-manifest.js?v=2`,
`${origin}/js/asset-manifest.js`
];

for(
const url of
candidates
){

try{
const src =
await netGet(
session,
url,
12000
);
const assets =
parseManifestAssets(
src
);

if(
Object.keys(
assets
).length >
10
){
return assets;
}
}catch{
/* next */
}

}

return readBundledManifestAssets();

}

function manifestAssetUrl(
origin,
key,
ver
){

const prefix =
key.endsWith(
".css"
)
? "/css/"
: "/js/";

return `${origin}${prefix}${key}?v=${ver}`;

}

function isChartRelatedKey(
key
){

return (
CHART_KEY_RE.test(
key
) ||
CHART_CSS_RE.test(
key
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

function buildWarmLists(
origin,
manifestAssets
){

const seen =
new Set();
const phase1 =
[];

function push(
url
){

if(
!url ||
seen.has(
url
)
){
return;
}

seen.add(
url
);
phase1.push(
url
);

}

push(
`${origin}/vendor/lightweight-charts.standalone.production.js`
);

if(
manifestAssets
){

for(
const key of
MANIFEST_PRIORITY
){

const ver =
manifestAssets[
key
];

if(
ver !=
null
){
push(
manifestAssetUrl(
origin,
key,
ver
)
);
}

}

const phase2 =
[];

for(
const [
key,
ver
] of
Object.entries(
manifestAssets
)
){

if(
MANIFEST_PRIORITY.includes(
key
)
){
continue;
}

if(
!isChartRelatedKey(
key
)
){
continue;
}

const url =
manifestAssetUrl(
origin,
key,
ver
);

if(
seen.has(
url
)
){
continue;
}

seen.add(
url
);
phase2.push(
url
);

}

return {
phase1,
phase2:
phase2.slice(
0,
MAX_PHASE2
)
};

}

return {
phase1,
phase2:[]
};

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
const manifestAssets =
await fetchRemoteManifestAssets(
session,
origin
);
const {
phase1,
phase2
} =
buildWarmLists(
origin,
manifestAssets
);

const htmlExtras =
new Set();

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
pageUrl,
15000
);

for(
const url of
collectAssetUrls(
html,
pageUrl
)
){
htmlExtras.add(
url
);
}

}catch{
/* skip */
}

}

const phase2Merged =
[
...phase2
];

for(
const url of
htmlExtras
){

if(
phase1.includes(
url
) ||
phase2Merged.includes(
url
)
){
continue;
}

phase2Merged.push(
url
);

if(
phase2Merged.length >=
MAX_PHASE2
){
break;
}

}

await mapPool(
phase1,
MAX_CONCURRENT,
url=>
netFetchBody(
session,
url
)
);

const phase2Promise =
mapPool(
phase2Merged,
MAX_CONCURRENT,
url=>
netFetchBody(
session,
url
)
).then(
()=>
phase2Merged.length
);

return {
phase1:
phase1.length,
phase2:
phase2Merged.length,
phase2Promise
};

}

module.exports =
{
warmStaticCache
};
