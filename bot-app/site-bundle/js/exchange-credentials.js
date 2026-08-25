/**
 * Локальные API-ключи бирж (renderer). Secret на диск не пишем —
 * desktop сохраняет через IPC; веб-fallback только apiKey + hasSecret.
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

function persistSafePayload(
exchangeId,
payload
){

const safe =
{
apiKey:
String(
payload?.apiKey ||
""
).trim(),
hasSecret:
!!payload?.hasSecret,
savedAt:
Number(
payload?.savedAt
) ||
Date.now()
};

localStorage.setItem(
storageKey(
exchangeId
),
JSON.stringify(
safe
)
);

return safe;

}

function scrubStoredSecret(
exchangeId,
parsed
){

if(
!parsed ||
typeof parsed !==
"object"
){
return parsed;
}

if(
parsed.apiSecret ==
null &&
parsed.secret ==
null
){
return parsed;
}

try{
return persistSafePayload(
exchangeId,
{
apiKey:
parsed.apiKey,
hasSecret:
!!parsed.hasSecret ||
!!parsed.apiSecret ||
!!parsed.secret,
savedAt:
parsed.savedAt
}
);
}catch{
return {
apiKey:
parsed.apiKey,
hasSecret:
true,
savedAt:
parsed.savedAt
};
}

}

export function readExchangeCredentials(
exchangeId
){

try{

const parsed =
scrubStoredSecret(
exchangeId,
readExchangeCredentialsRaw(
exchangeId
)
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

persistSafePayload(
exchangeId,
{
apiKey:
key,
hasSecret:
!!secret ||
!!prev?.hasSecret,
savedAt:
Date.now()
}
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

if(
!raw
){
return null;
}

const parsed =
JSON.parse(
raw
);

return scrubStoredSecret(
exchangeId,
parsed &&
typeof parsed ===
"object"
? parsed
: null
);

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
