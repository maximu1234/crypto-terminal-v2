/**
 * Прокси Bybit REST — обход блокировок браузера (расширения, DNS, Protect).
 * GET /api/bybit?path=/v5/market/tickers?category=linear
 */

const BASES = [
"https://api.bybit.com",
"https://api.bytick.com"
];

export default async function handler(
req,
res
){

const path =
typeof req.query?.path === "string"
? req.query.path
: "";

if(
!path.startsWith("/v5/")
){
res.statusCode = 400;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
retCode: -1,
retMsg: "invalid path"
})
);
return;
}

let lastErr = null;

for(
const base of BASES
){

try{

const upstream =
await fetch(
`${base}${path}`,
{
headers: {
Accept: "application/json"
}
}
);

const body =
await upstream.text();

res.statusCode = upstream.status;
res.setHeader(
"Content-Type",
"application/json"
);
res.setHeader(
"Cache-Control",
"public, s-maxage=8, stale-while-revalidate=30"
);
res.end(body);
return;

}catch(err){
lastErr = err;

}

}

res.statusCode = 502;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
retCode: -1,
retMsg: lastErr?.message || "upstream failed"
})
);

}
