/**
 * BingX HMAC SHA256 signing — shared by REST + tests.
 */
const crypto =
require(
"crypto"
);

const FORBIDDEN_PARAM =
/[&=?#\r\n]/;

function validateParams(
params
){

for(
const [
key,
value
] of Object.entries(
params ||
{}
)
){

const s =
String(
value
);

if(
FORBIDDEN_PARAM.test(
s
)
){
throw new Error(
`Param "${key}" has forbidden char in: "${s}"`
);
}

}

}

function buildCanonical(
params
){

return Object.keys(
params
)
.sort()
.map(
key=>`${key}=${params[
key
]}`
)
.join(
"&"
);

}

function signPayload(
secret,
params
){

const canonical =
buildCanonical(
params
);

return crypto
.createHmac(
"sha256",
secret
)
.update(
canonical
)
.digest(
"hex"
);

}

function withTimestamp(
params,
timestampMs
){

return {
...params,
timestamp:
timestampMs ??
Date.now()
};

}

module.exports =
{
FORBIDDEN_PARAM,
validateParams,
buildCanonical,
signPayload,
withTimestamp
};
