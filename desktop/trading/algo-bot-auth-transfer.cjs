/**
 * CJS port of js/auth-session-transfer.js decode (LAN auth push).
 */
const PREFIX =
"mcauth1.";

function isTransferableAuthSession(
session
){

return !!(
session &&
typeof session ===
"object" &&
typeof session.access_token ===
"string" &&
session.access_token.trim() &&
session.user &&
typeof session.user ===
"object"
);

}

function parseAuthSessionRaw(
raw
){

if(
typeof raw !==
"string" ||
!raw.trim()
){
return null;
}

try{
const data =
JSON.parse(
raw
);
const session =
data?.access_token
? data
: data?.currentSession ||
data?.session ||
null;

if(
!isTransferableAuthSession(
session
)
){
return null;
}

const refresh =
String(
session.refresh_token ||
data?.refresh_token ||
""
).trim();

if(
refresh &&
!session.refresh_token
){
session.refresh_token =
refresh;
}

return session;
}catch{
return null;
}

}

function normalizeAuthSessionRaw(
rawOrSession
){

if(
typeof rawOrSession ===
"string"
){
const session =
parseAuthSessionRaw(
rawOrSession
);

if(
!session
){
throw new Error(
"Некорректная сессия."
);
}

return JSON.stringify(
session
);
}

if(
!isTransferableAuthSession(
rawOrSession
)
){
throw new Error(
"Некорректная сессия."
);
}

return JSON.stringify(
rawOrSession
);

}

function fromBase64Url(
b64url
){

const b64 =
String(
b64url ||
""
).replace(
/-/g,
"+"
).replace(
/_/g,
"/"
);
const pad =
b64.length %
4 ===
0
? ""
: "=".repeat(
4 -
(
b64.length %
4
)
);

return Buffer.from(
b64 +
pad,
"base64"
).toString(
"utf8"
);

}

/**
 * @param {string} input
 * @returns {{ raw: string, session: object }}
 */
function decodeAuthSessionTransfer(
input
){

let text =
String(
input ||
""
).trim();

if(
!text
){
throw new Error(
"Пустая строка сессии."
);
}

if(
text.startsWith(
PREFIX
)
){
try{
text =
fromBase64Url(
text.slice(
PREFIX.length
)
);
}catch{
throw new Error(
"Не удалось разобрать строку сессии."
);
}
}

const raw =
normalizeAuthSessionRaw(
text
);
const session =
parseAuthSessionRaw(
raw
);

if(
!session
){
throw new Error(
"Некорректная сессия."
);
}

if(
!String(
session.refresh_token ||
""
).trim()
){
throw new Error(
"В сессии нет refresh_token."
);
}

return {
raw,
session
};

}

module.exports =
{
PREFIX,
decodeAuthSessionTransfer,
parseAuthSessionRaw,
isTransferableAuthSession
};
