/**
 * Прокси MOEX ISS — обход CORS в браузере и desktop renderer.
 * GET /api/moex?path=/iss/engines/stock/markets/shares/boards/TQBR/securities.json
 */

const MOEX_ISS_BASE =
"https://iss.moex.com";

const UPSTREAM_HEADERS =
{
Accept:
"application/json",
"User-Agent":
"Multichart/1.0"
};

function isPublicMoexIssPath(
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

if(
pathname ===
"/iss.json" ||
pathname ===
"/iss/index.json" ||
pathname ===
"/iss/engines.json"
){
return true;
}

if(
!pathname.startsWith(
"/iss/engines/"
)
){
return false;
}

/* Только публичные market/candles — без /iss/history и orderbook. */
if(
pathname.includes(
"/orderbook"
) ||
pathname.includes(
"/trades"
)
){
return false;
}

return (
pathname.includes(
"/securities"
) ||
pathname.includes(
"/candles"
) ||
pathname.includes(
"/candleborders"
) ||
pathname.endsWith(
".json"
)
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
!isPublicMoexIssPath(
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
`${MOEX_ISS_BASE}${path}`,
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
"public, s-maxage=5, stale-while-revalidate=20"
);
res.setHeader(
"Access-Control-Allow-Origin",
"*"
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
String(
err?.message ||
err ||
"moex upstream failed"
)
})
);

}

};
