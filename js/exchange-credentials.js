/**
 * Локальные API-ключи бирж (renderer). Торговый IPC пока только Bybit.
 */
const STORAGE_PREFIX =
"multichart_exchange_credentials_v1_";

function storageKey(
exchangeId
){

return `${STORAGE_PREFIX}${String(
exchangeId ||
""
).trim().toLowerCase()}`;

}

export function readExchangeCredentials(
exchangeId
){

try{

const raw =
localStorage.getItem(
storageKey(
exchangeId
)
);

if(
!raw
){
return null;
}

const parsed =
JSON.parse(
raw
);

if(
!parsed?.apiKey
){
return null;
}

return {
apiKey:
String(
parsed.apiKey
),
hasSecret:
!!parsed.hasSecret,
configured:
true
};

}catch{
return null;
}

}

export function writeExchangeCredentials(
exchangeId,
{
apiKey,
apiSecret
}
){

const key =
String(
apiKey ||
""
).trim();

if(
!key
){
throw new Error(
"API key is required"
);

}

const prev =
readExchangeCredentialsRaw(
exchangeId
);

const secret =
String(
apiSecret ||
""
).trim();

const payload =
{
apiKey:
key,
hasSecret:
!!secret ||
!!prev?.hasSecret,
savedAt:
Date.now()
};

if(
secret
){
payload.apiSecret =
secret;
}else if(
prev?.apiSecret
){
payload.apiSecret =
prev.apiSecret;
}

localStorage.setItem(
storageKey(
exchangeId
),
JSON.stringify(
payload
)
);

}

export function readExchangeCredentialsRaw(
exchangeId
){

try{

const raw =
localStorage.getItem(
storageKey(
exchangeId
)
);

return raw
? JSON.parse(
raw
)
: null;

}catch{
return null;
}

}

export function clearExchangeCredentials(
exchangeId
){

localStorage.removeItem(
storageKey(
exchangeId
)
);

}

export function getExchangeSecretForSave(
exchangeId,
inputValue,
secretSaved
){

const SECRET_PLACEHOLDER =
"••••••••••••••••";
const value =
String(
inputValue ||
""
).trim();

if(
secretSaved &&
(
!value ||
value ===
SECRET_PLACEHOLDER
)
){
return null;
}

return value;

}
