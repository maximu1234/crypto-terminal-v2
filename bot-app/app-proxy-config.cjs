/**
 * Normalize Multichart desktop proxy form values.
 * No Electron — kept pure so unit tests can require this file.
 */
"use strict";

/**
 * Chromium session.setProxy гоняет весь renderer через SOCKS.
 * «Только тики» (по умолчанию): REST Bybit в обходе, история свечей напрямую,
 * тики идут через локальный SOCKS-релей (у Chromium нет SOCKS5-авторизации).
 * Без галочки история свечей тоже через прокси, но не через Chromium:
 * его socks5 резолвит DNS локально и на том же реле забивает тики.
 * Свечи по SOCKS забирает main-процесс (удалённый DNS). HTTP-прокси без
 * релея по-прежнему отдаёт REST самому Chromium.
 * Облако (Supabase / Railway) всегда напрямую: кафе-SOCKS часто режет auth.
 */
const PROXY_BYPASS_ALWAYS =
"<-loopback>,localhost,127.0.0.1,::1,<local>," +
"*.supabase.co,.supabase.co,*.supabase.in," +
"*.up.railway.app,.up.railway.app";

const PROXY_BYBIT_REST_HOSTS =
"api.bybit.com,api.bytick.com,api-testnet.bybit.com";

const PROXY_BYPASS_RULES =
PROXY_BYBIT_REST_HOSTS +
"," +
PROXY_BYPASS_ALWAYS;

function normalizeProxyType(
raw
){

const type =
String(
raw ||
""
).trim().toLowerCase();

if(
type ===
"http" ||
type ===
"https"
){
return "http";
}

return "socks5";

}

function normalizePort(
raw
){

const port =
Number.parseInt(
String(
raw ??
""
).trim(),
10
);

if(
!Number.isFinite(
port
) ||
port <
1 ||
port >
65535
){
return 0;
}

return port;

}

function normalizeHost(
raw
){

let host =
String(
raw ||
""
).trim();

if(
!host
){
return "";
}

host =
host.replace(
/^[a-z][a-z0-9+.-]*:\/\//i,
""
);

const slash =
host.indexOf(
"/"
);

if(
slash >=
0
){
host =
host.slice(
0,
slash
);
}

const at =
host.lastIndexOf(
"@"
);

if(
at >=
0
){
host =
host.slice(
at +
1
);
}

host =
host.trim();

if(
host.startsWith(
"["
)
){
const end =
host.indexOf(
"]"
);

if(
end >
1
){
return host.slice(
0,
end +
1
);
}

return "";

}

return host;

}

function splitHostPort(
host,
port
){

let nextHost =
normalizeHost(
host
);
let nextPort =
normalizePort(
port
);

if(
!nextHost
){
return {
host:
"",
port:
nextPort
};
}

if(
nextHost.startsWith(
"["
)
){
const end =
nextHost.indexOf(
"]"
);
const rest =
end >=
0
? nextHost.slice(
end +
1
)
: "";

if(
rest.startsWith(
":"
) &&
!nextPort
){
nextPort =
normalizePort(
rest.slice(
1
)
);
}

nextHost =
end >=
0
? nextHost.slice(
0,
end +
1
)
: "";

return {
host:
nextHost,
port:
nextPort
};
}

const colon =
nextHost.lastIndexOf(
":"
);

if(
colon >
0 &&
/^\d+$/.test(
nextHost.slice(
colon +
1
)
)
){

if(
!nextPort
){
nextPort =
normalizePort(
nextHost.slice(
colon +
1
)
);
}

nextHost =
nextHost.slice(
0,
colon
);

}

return {
host:
nextHost,
port:
nextPort
};

}

function normalizeUsername(
raw
){

return String(
raw ||
""
).replace(
/[\r\n]/g,
""
).trim();

}

function normalizePassword(
raw
){

return String(
raw ||
""
).replace(
/[\r\n]/g,
""
);

}

function normalizeProxySettings(
raw
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};

const split =
splitHostPort(
src.host,
src.port
);

return {
enabled:
!!src.enabled,
ticksOnly:
src.ticksOnly !==
false,
type:
normalizeProxyType(
src.type
),
host:
split.host,
port:
split.port,
username:
normalizeUsername(
src.username
),
password:
normalizePassword(
src.password
)
};

}

function buildProxyBypassRules(
cfg
){

const settings =
normalizeProxySettings(
cfg ||
{}
);

if(
settings.ticksOnly !==
false ||
settings.type !==
"http"
){
return PROXY_BYPASS_RULES;
}

return PROXY_BYPASS_ALWAYS;

}

function candlesUseMainRelay(
cfg
){

const settings =
normalizeProxySettings(
cfg ||
{}
);

return !!(
settings.ticksOnly ===
false &&
settings.type !==
"http" &&
isProxyConfigReady(
settings
)
);

}

function isProxyConfigReady(
cfg
){

return !!(
cfg &&
cfg.enabled &&
cfg.host &&
cfg.port >
0
);

}

function formatProxyHostForRules(
host
){

const value =
String(
host ||
""
).trim();

if(
!value
){
return "";
}

if(
value.startsWith(
"["
)
){
return value;
}

if(
value.includes(
":"
)
){
return `[${value}]`;
}

return value;

}

function buildProxyRules(
cfg
){

if(
!isProxyConfigReady(
cfg
)
){
return "";
}

const scheme =
cfg.type ===
"http"
? "http"
: "socks5";

const host =
formatProxyHostForRules(
cfg.host
);

return `${scheme}://${host}:${cfg.port}`;

}

function shouldProxyBybitRestUrl(
url
){

const value =
String(
url ||
""
);

return /https:\/\/(?:api\.bybit\.com|api\.bytick\.com|api-testnet\.bybit\.com)\b/i.test(
value
);

}

module.exports =
{
PROXY_BYPASS_RULES,
PROXY_BYPASS_ALWAYS,
buildProxyBypassRules,
candlesUseMainRelay,
normalizeProxySettings,
isProxyConfigReady,
buildProxyRules,
shouldProxyBybitRestUrl
};
