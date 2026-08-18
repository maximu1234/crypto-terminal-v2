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

function isPublicBingxPath(
raw
){

if(
typeof raw !==
"string" ||
raw.includes(
".."
) ||
raw.includes(
"\\"
)
){
return false;
}

const pathname =
raw.split(
"?"
)[
0
];

return pathname.startsWith(
"/openApi/swap/v2/quote/"
) ||
pathname.startsWith(
"/openApi/swap/v3/quote/"
) ||
pathname ===
"/openApi/swap/v2/server/time" ||
pathname.startsWith(
"/openApi/spot/v1/ticker/"
);

}

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
!isPublicBingxPath(
path
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
