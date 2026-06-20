/**
 * multichart://local — статика из site-bundle; /api/* → Vercel.
 * Схема multichart уже в Info.plist (auth + UI).
 */
const {
protocol,
net
} =
require(
"electron"
);
const fs =
require(
"fs"
);
const path =
require(
"path"
);

const APP_SCHEME =
"multichart";

const APP_HOST =
"local";

const MIME =
{
".html":
"text/html; charset=utf-8",
".js":
"text/javascript; charset=utf-8",
".mjs":
"text/javascript; charset=utf-8",
".css":
"text/css; charset=utf-8",
".json":
"application/json; charset=utf-8",
".png":
"image/png",
".jpg":
"image/jpeg",
".jpeg":
"image/jpeg",
".svg":
"image/svg+xml",
".webp":
"image/webp",
".woff2":
"font/woff2",
".woff":
"font/woff",
".mp3":
"audio/mpeg",
".ico":
"image/x-icon",
".txt":
"text/plain; charset=utf-8"
};

function bundledOrigin(){

return `${APP_SCHEME}://${APP_HOST}`;

}

function registerAppScheme(){

protocol.registerSchemesAsPrivileged([
{
scheme:
APP_SCHEME,
privileges:
{
standard:
true,
secure:
true,
supportFetchAPI:
true,
corsEnabled:
true,
stream:
true,
codeCache:
true
}
}
]);

}

function resolveBundleRoot(
bundleRoot
){

if(
fs.existsSync(
path.join(
bundleRoot,
"coins.html"
)
)
){
return bundleRoot;
}

const unpacked =
path.join(
bundleRoot,
"..",
"app.asar.unpacked",
"site-bundle"
);

if(
fs.existsSync(
path.join(
unpacked,
"coins.html"
)
)
){
return unpacked;
}

return bundleRoot;

}

function getMime(
filePath
){

return (
MIME[
path.extname(
filePath
).toLowerCase()
] ||
"application/octet-stream"
);

}

function resolveBundleFile(
bundleRoot,
pathname
){

let clean =
decodeURIComponent(
pathname
|| "/"
);

if(
clean.endsWith(
"/"
)
){
clean +=
"index.html";
}

if(
clean ===
"/"
){
clean =
"/coins.html";
}

let filePath =
path.join(
bundleRoot,
clean
);

if(
fs.existsSync(
filePath
) &&
fs.statSync(
filePath
).isDirectory()
){
filePath =
path.join(
filePath,
"index.html"
);
}

if(
!fs.existsSync(
filePath
) &&
!path.extname(
filePath
)
){
const withHtml =
`${filePath}.html`;

if(
fs.existsSync(
withHtml
)
){
filePath =
withHtml;
}

}

const normalized =
path.normalize(
filePath
);
const rootNorm =
path.normalize(
bundleRoot
);

if(
!normalized.startsWith(
rootNorm
)
){
return null;
}

if(
!fs.existsSync(
normalized
) ||
fs.statSync(
normalized
).isDirectory()
){
return null;
}

return normalized;

}

function setupSiteProtocol({
bundleRoot,
remoteApiOrigin
}){

const root =
resolveBundleRoot(
bundleRoot
);

protocol.handle(
APP_SCHEME,
async(
request
)=>{

const reqUrl =
new URL(
request.url
);

if(
reqUrl.hostname !==
APP_HOST
){
return new Response(
"Not Found",
{
status:
404
}
);
}

if(
reqUrl.pathname.startsWith(
"/auth/"
)
){
return new Response(
"Auth callback",
{
status:
204
}
);
}

if(
reqUrl.pathname.startsWith(
"/api/"
)
){

const remote =
`${String(
remoteApiOrigin
).replace(
/\/$/,
""
)}${reqUrl.pathname}${reqUrl.search}`;

return net.fetch(
remote,
{
method:
request.method,
headers:
request.headers,
body:
request.body
}
);

}

const filePath =
resolveBundleFile(
root,
reqUrl.pathname
);

if(
!filePath
){
return new Response(
"Not Found",
{
status:
404
}
);

}

const data =
fs.readFileSync(
filePath
);

return new Response(
data,
{
headers:{
"Content-Type":
getMime(
filePath
)
}
}
);

}
);

return root;

}

module.exports =
{
APP_SCHEME,
APP_HOST,
bundledOrigin,
registerAppScheme,
setupSiteProtocol,
resolveBundleRoot
};
