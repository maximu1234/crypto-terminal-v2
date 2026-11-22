/**
 * Chromium session.resolveProxy text → proxy URL.
 * No Electron, so unit tests can load this file.
 */
"use strict";

function parseSystemProxy(
raw
){

const parts =
String(
raw ||
""
).split(
/[;\n]/
);

for(
const part of parts
){

const token =
part.trim();

if(
!token ||
/^DIRECT$/i.test(
token
)
){
continue;
}

const match =
/^(PROXY|HTTPS|SOCKS4|SOCKS5|SOCKS)\s+(\S+)$/i.exec(
token
);

if(
!match
){
continue;
}

const kind =
match[
1
].toUpperCase();
const endpoint =
match[
2
];

if(
endpoint.length >
200 ||
endpoint.includes(
"@"
) ||
endpoint.includes(
"/"
)
){
continue;
}

if(
kind ===
"SOCKS4"
){
return {
url:
`socks4://${endpoint}`
};
}

if(
kind ===
"SOCKS" ||
kind ===
"SOCKS5"
){
return {
url:
`socks5://${endpoint}`
};
}

if(
kind ===
"HTTPS"
){
return {
url:
`https://${endpoint}`
};
}

return {
url:
`http://${endpoint}`
};

}

return null;

}

module.exports =
{
parseSystemProxy
};
