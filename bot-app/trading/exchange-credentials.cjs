/**
 * Per-exchange API credentials — local userData files.
 */
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
"bybit-api-credentials.json",
bingx:
"bingx-api-credentials.json"
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

function getCredentials(
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

function saveCredentials(
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
getCredentials(
id
);

if(
existing?.apiSecret
){
secret =
existing.apiSecret;
}else{
throw new Error(
"API secret is required"
);
}

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

function clearCredentials(
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
"Failed to clear credentials"
);
}

}

}

/**
 * Status for IPC / UI. Full apiKey only when opts.revealApiKey
 * (settings form). At rest: OS-encrypted off macOS when available;
 * darwin uses plaintext JSON mode 0o600.
 */
function getStatus(
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
getCredentials(
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
isCredentialEncryptionAvailable()
}
);

}

module.exports =
{
KNOWN_EXCHANGES,
normalizeExchangeId,
getCredentials,
saveCredentials,
clearCredentials,
getStatus
};
