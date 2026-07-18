/**
 * Bybit API credentials — backward-compatible wrapper.
 */
const {
getCredentials,
saveCredentials,
clearCredentials,
getStatus
} =
require(
"./exchange-credentials.cjs"
);

module.exports =
{
getCredentials:()=>
getCredentials(
"bybit"
),
saveCredentials:(
payload
)=>
saveCredentials(
"bybit",
payload ||
{}
),
clearCredentials:()=>
clearCredentials(
"bybit"
),
getStatus:(
opts
)=>
getStatus(
"bybit",
opts ||
{}
)
};
