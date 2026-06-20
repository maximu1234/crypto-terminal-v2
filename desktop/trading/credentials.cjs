/**
 * Bybit API credentials — macOS Keychain via Electron safeStorage.
 */
const {
safeStorage
} =
require(
"electron"
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

const STORE_NAME =
"bybit-api-credentials.json";

function storePath(){

return path.join(
app.getPath(
"userData"
),
STORE_NAME
);

}

function canEncrypt(){

return (
safeStorage.isEncryptionAvailable()
);

}

function readStore(){

const file =
storePath();

if(
!fs.existsSync(
file
)
){
return null;
}

try{
const raw =
fs.readFileSync(
file
);

if(
!raw.length
){
return null;
}

if(
canEncrypt()
){
return JSON.parse(
safeStorage.decryptString(
raw
)
);
}

return JSON.parse(
raw.toString(
"utf8"
)
);
}catch{
return null;
}

}

function writeStore(
data
){

const payload =
JSON.stringify(
data
);
const buf =
canEncrypt()
? safeStorage.encryptString(
payload
)
: Buffer.from(
payload,
"utf8"
);

fs.mkdirSync(
path.dirname(
storePath()
),
{
recursive:
true
}
);
fs.writeFileSync(
storePath(),
buf
);

}

function getCredentials(){

const store =
readStore();

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

function saveCredentials({
apiKey,
apiSecret,
testnet = false
}){

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
getCredentials();

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

writeStore({
apiKey:
key,
apiSecret:
secret,
testnet:
!!testnet
});

}

function clearCredentials(){

try{
fs.unlinkSync(
storePath()
);
}catch{
if(
fs.existsSync(
storePath()
)
){
throw new Error(
"Failed to clear credentials"
);
}
}

}

function getStatus(){

const creds =
getCredentials();

return {
configured:
!!creds,
testnet:
!!creds?.testnet,
encryptionAvailable:
canEncrypt(),
apiKey:
creds?.apiKey ||
"",
hasSecret:
!!creds?.apiSecret
};

}

module.exports =
{
getCredentials,
saveCredentials,
clearCredentials,
getStatus
};
