/**
 * Algo trading profile credentials — isolated from Terminal/Diary keys.
 * Files: bybit-algo-api-credentials.json, bingx-algo-api-credentials.json
 * Never read/write exchange-credentials.cjs stores.
 */
const crypto =
require(
"crypto"
);
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const {
app
} =
require(
"electron"
);
const {
readSecretText,
writeSecretText,
isCredentialEncryptionAvailable
} =
require(
"../user-store.cjs"
);
const {
buildCredentialsStatus
} =
require(
"./credentials-status.cjs"
);

const STORE_BY_EXCHANGE =
{
bybit:
"bybit-algo-api-credentials.json",
bingx:
"bingx-algo-api-credentials.json"
};

const KNOWN_EXCHANGES =
new Set(
Object.keys(
STORE_BY_EXCHANGE
)
);

function normalizeExchangeId(
exchangeId
){

const id =
String(
exchangeId ||
"bybit"
).trim().toLowerCase();

return KNOWN_EXCHANGES.has(
id
)
? id
: "bybit";

}

function storePath(
exchangeId
){

const file =
STORE_BY_EXCHANGE[
normalizeExchangeId(
exchangeId
)
];

return path.join(
app.getPath(
"userData"
),
file
);

}

function readStore(
exchangeId
){

const raw =
readSecretText(
storePath(
exchangeId
)
);

if(
!raw
){
return null;
}

try{
return JSON.parse(
raw
);
}catch{
return null;
}

}

function writeStore(
exchangeId,
data
){

writeSecretText(
storePath(
exchangeId
),
JSON.stringify(
data
)
);

}

function getAlgoCredentials(
exchangeId =
"bybit"
){

const store =
readStore(
exchangeId
);

if(
!store?.apiKey ||
!store?.apiSecret
){
return null;
}

return {
apiKey:
String(
store.apiKey
),
apiSecret:
String(
store.apiSecret
),
testnet:
!!store.testnet
};

}

function saveAlgoCredentials(
exchangeId,
{
apiKey,
apiSecret,
testnet = false
}
){

const id =
normalizeExchangeId(
exchangeId
);
const key =
String(
apiKey ||
""
).trim();
let secret =
String(
apiSecret ||
""
).trim();

if(
!key
){
throw new Error(
"API key is required"
);
}

if(
!secret
){
const existing =
getAlgoCredentials(
id
);

if(
!existing?.apiSecret
){
throw new Error(
"API secret is required"
);
}

secret =
existing.apiSecret;
}

writeStore(
id,
{
apiKey:
key,
apiSecret:
secret,
testnet:
!!testnet
}
);

}

function clearAlgoCredentials(
exchangeId =
"bybit"
){

const filePath =
storePath(
exchangeId
);

try{
fs.unlinkSync(
filePath
);
}catch{

if(
fs.existsSync(
filePath
)
){
throw new Error(
"Failed to clear algo credentials"
);
}

}

}

function getAlgoCredentialsStatus(
exchangeId =
"bybit",
opts =
{}
){

const id =
normalizeExchangeId(
exchangeId
);
const creds =
getAlgoCredentials(
id
);

return buildCredentialsStatus(
{
exchangeId:
id,
creds,
revealApiKey:
!!opts?.revealApiKey,
encryptionAvailable:
isCredentialEncryptionAvailable(),
profile:
"algo"
}
);

}

/**
 * Cloud bot lock key: SHA-256 of "exchange:net:apiKey" (never exposes raw key).
 * @returns {{ ok: true, lockKey: string, exchangeId: string } | { ok: false, code: string, message: string }}
 */
function getAlgoBotLockKey(
exchangeId =
"bybit"
){

const id =
normalizeExchangeId(
exchangeId
);
const creds =
getAlgoCredentials(
id
);
const apiKey =
String(
creds?.apiKey ||
""
).trim();

if(
!apiKey
){
return {
ok:
false,
code:
"no_keys",
message:
"Алго API-ключи не настроены"
};
}

const net =
creds?.testnet
? "testnet"
: "mainnet";
const material =
`${id}:${net}:${apiKey}`;
const lockKey =
crypto
.createHash(
"sha256"
)
.update(
material,
"utf8"
)
.digest(
"hex"
);

return {
ok:
true,
lockKey,
exchangeId:
id
};

}

module.exports =
{
KNOWN_EXCHANGES,
normalizeExchangeId,
getAlgoCredentials,
saveAlgoCredentials,
clearAlgoCredentials,
getAlgoCredentialsStatus,
getAlgoBotLockKey
};
