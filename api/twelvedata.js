/**
 * Прокси Twelve Data — ключ только на сервере (Vercel env).
 * GET /api/twelvedata?symbol=AAPL&interval=1h&outputsize=2500
 */

const BASE =
"https://api.twelvedata.com";

const INTERVAL_RE =
/^(1min|5min|15min|30min|45min|1h|2h|4h|8h|1day|1week|1month)$/;

function pickQuery(
query,
key
){

const raw =
query?.[key];

return typeof raw === "string"
? raw.trim()
: "";

}

module.exports = async function handler(
req,
res
){

if(
req.method !== "GET"
){
res.statusCode = 405;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
error: "method not allowed"
})
);
return;
}

const apiKey =
process.env.TWELVEDATA_API_KEY ||
process.env.TWELVE_DATA_API_KEY ||
"";

if(!apiKey){
res.statusCode = 500;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
error: "TWELVEDATA_API_KEY not configured"
})
);
return;
}

const symbol =
pickQuery(
req.query,
"symbol"
);

const interval =
pickQuery(
req.query,
"interval"
);

const outputsizeRaw =
pickQuery(
req.query,
"outputsize"
) || "2500";

if(
!symbol ||
symbol.length > 32 ||
!/^[A-Za-z0-9./:_-]+$/.test(symbol)
){
res.statusCode = 400;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
error: "invalid symbol"
})
);
return;
}

if(
!interval ||
!INTERVAL_RE.test(interval)
){
res.statusCode = 400;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
error: "invalid interval"
})
);
return;
}

const outputsize =
Math.min(
5000,
Math.max(
1,
parseInt(
outputsizeRaw,
10
) || 2500
)
);

const url =
new URL(
`${BASE}/time_series`
);

url.searchParams.set(
"symbol",
symbol
);
url.searchParams.set(
"interval",
interval
);
url.searchParams.set(
"outputsize",
String(outputsize)
);
url.searchParams.set(
"apikey",
apiKey
);

try{

const upstream =
await fetch(
url.toString(),
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
"public, s-maxage=60, stale-while-revalidate=120"
);
res.end(body);

}catch(err){

res.statusCode = 502;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
error: err?.message || "upstream failed"
})
);

}

}
