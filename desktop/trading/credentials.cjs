/**
 * Bybit API credentials — local userData file (no Keychain prompts).
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
readPlainWithLegacyMigration,
writePlain
} =
require(
"../user-store.cjs"
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

function readStore(){

const raw =
readPlainWithLegacyMigration(
storePath()
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
data
){

writePlain(
storePath(),
JSON.stringify(
data
)
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
true,
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
