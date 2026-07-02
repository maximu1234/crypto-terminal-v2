/**
 * Прокси BingX REST — обход CORS в браузере и desktop renderer.
 * GET /api/bingx?path=/openApi/swap/v2/quote/ticker
 */

const BINGX_API_BASE =
"https://open-api.bingx.com";

const UPSTREAM_HEADERS =
{
Accept:
"application/json",
"User-Agent":
"Multichart/1.0"
};

module.exports = async function handler(
req,
res
){

const path =
typeof req.query?.path ===
"string"
? req.query.path
: "";

if(
!path.startsWith(
"/openApi/"
)
){
res.statusCode =
400;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
code:
-1,
msg:
"invalid path"
})
);
return;
}

try{

const upstream =
await fetch(
`${BINGX_API_BASE}${path}`,
{
headers:
UPSTREAM_HEADERS
}
);

const body =
await upstream.text();

res.statusCode =
upstream.status;
res.setHeader(
"Content-Type",
"application/json"
);
res.setHeader(
"Cache-Control",
"public, s-maxage=8, stale-while-revalidate=30"
);
res.end(
body
);

}catch(
err
){

res.statusCode =
502;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
code:
-1,
msg:
err?.message ||
"upstream failed"
})
);

}

}
