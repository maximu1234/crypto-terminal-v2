export const ALERT_DEEP_LINK_EXCHANGE_PARAM =
"exchange";

const KNOWN_EXCHANGES =
new Set([
"bybit",
"bingx"
]);

function normalizeAlertChartSymbol(
symbol
){

const raw =
String(
symbol ||
""
).trim().toUpperCase();

if(
!raw
){
return "";
}

return raw.replace(
/\.P$/i,
""
);

}

export function isAlertDeepLinkExchangeId(
exchangeId
){

const id =
String(
exchangeId ||
""
).trim().toLowerCase();

return KNOWN_EXCHANGES.has(
id
);

}

export function parseAlertDeepLinkExchange(
params
){

const raw =
typeof params?.get ===
"function"
? params.get(
ALERT_DEEP_LINK_EXCHANGE_PARAM
)
: params?.[
ALERT_DEEP_LINK_EXCHANGE_PARAM
];

if(
!raw
){
return "";
}

const id =
String(
raw
).trim().toLowerCase();

return isAlertDeepLinkExchangeId(
id
)
? id
: "";

}

export function buildAlertChartUrl({
symbol,
tf = "60",
exchangeId
} = {}){

const sym =
normalizeAlertChartSymbol(
symbol
);

if(
!sym
){
return "";
}

const params =
new URLSearchParams({
symbol:
sym,
tf:
String(
tf ||
"60"
)
});

const ex =
String(
exchangeId ||
""
).trim().toLowerCase();

if(
isAlertDeepLinkExchangeId(
ex
)
){
params.set(
ALERT_DEEP_LINK_EXCHANGE_PARAM,
ex
);
}

return `/terminal.html?${params}`;

}
