/**
 * Compact Multichart ↔ Algo Bot session transfer (no new Supabase tables).
 * Payload is the same JSON stored in ct_supabase_auth / cloud-auth-session.json.
 */

export const AUTH_SESSION_TRANSFER_PREFIX =
"mcauth1.";

/**
 * @param {unknown} session
 * @returns {session is { access_token: string, refresh_token?: string, user?: object, expires_at?: number }}
 */
export function isTransferableAuthSession(
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

/**
 * @param {string} raw
 * @returns {{ access_token: string, refresh_token?: string, user?: object, expires_at?: number }|null}
 */
export function parseAuthSessionRaw(
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

/**
 * Normalize to a JSON string supabase-js / parseAuthSessionRaw understand.
 * @param {string|object} rawOrSession
 * @returns {string}
 */
export function normalizeAuthSessionRaw(
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

function toBase64Url(
text
){

const bytes =
new TextEncoder().encode(
text
);
let bin =
"";

for(
let i =
0;
i <
bytes.length;
i++
){
bin +=
String.fromCharCode(
bytes[i]
);
}

return btoa(
bin
).replace(
/\+/g,
"-"
).replace(
/\//g,
"_"
).replace(
/=+$/g,
""
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
const bin =
atob(
b64 +
pad
);
const bytes =
new Uint8Array(
bin.length
);

for(
let i =
0;
i <
bin.length;
i++
){
bytes[i] =
bin.charCodeAt(
i
);
}

return new TextDecoder().decode(
bytes
);

}

/**
 * @param {string|object} rawOrSession
 * @returns {string}
 */
export function encodeAuthSessionTransfer(
rawOrSession
){

const raw =
normalizeAuthSessionRaw(
rawOrSession
);
const session =
parseAuthSessionRaw(
raw
);

if(
!session?.refresh_token
){
throw new Error(
"В сессии нет refresh_token. Войдите снова в Multichart и скопируйте ещё раз."
);
}

return AUTH_SESSION_TRANSFER_PREFIX +
toBase64Url(
raw
);

}

/**
 * @param {string} input
 * @returns {{ raw: string, session: object }}
 */
export function decodeAuthSessionTransfer(
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
"Вставьте строку сессии из Multichart."
);
}

if(
text.startsWith(
AUTH_SESSION_TRANSFER_PREFIX
)
){
try{
text =
fromBase64Url(
text.slice(
AUTH_SESSION_TRANSFER_PREFIX.length
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
"В сессии нет refresh_token. Скопируйте снова из Multichart после входа."
);
}

return {
raw,
session
};

}
