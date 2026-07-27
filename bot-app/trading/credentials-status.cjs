/**
 * Pure credentials status shaping (testable without Electron).
 */

function maskApiKeyHint(
apiKey
){

const key =
String(
apiKey ||
""
);

if(
!key
){
return "";
}

if(
key.length <=
4
){
return "••••";
}

return `••••${key.slice(
-4
)}`;

}

/**
 * @param {{
 *   exchangeId: string,
 *   creds: null | { apiKey?: string, apiSecret?: string, testnet?: boolean },
 *   revealApiKey?: boolean,
 *   encryptionAvailable?: boolean
 * }} opts
 */
function buildCredentialsStatus(
opts =
{}
){

const creds =
opts.creds ||
null;
const reveal =
!!opts.revealApiKey;
const rawKey =
creds?.apiKey ||
"";

return {
exchangeId:
String(
opts.exchangeId ||
"bybit"
),
configured:
!!(
creds?.apiKey &&
creds?.apiSecret
),
testnet:
!!creds?.testnet,
encryptionAvailable:
!!opts.encryptionAvailable,
apiKey:
reveal
? rawKey
: "",
apiKeyHint:
reveal
? maskApiKeyHint(
rawKey
)
: "",
hasSecret:
!!creds?.apiSecret
};

}

module.exports =
{
maskApiKeyHint,
buildCredentialsStatus
};
