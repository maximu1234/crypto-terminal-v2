import {
isCloudLoggedInEffective,
getEffectiveCloudUserEmail
} from "./cloud-sync.js?v=39";

function normalizeEmail(
raw
){

return String(
raw ||
""
).trim().toLowerCase();

}

export function isDesktopTradeDiaryContext(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

export async function getTradeDiaryOwnerEmails(){

try{

const env =
await import("./supabase-env.js?v=5");

const list =
[];

if(
env.TRADE_DIARY_OWNER_EMAIL
){
list.push(
env.TRADE_DIARY_OWNER_EMAIL
);
}

if(
Array.isArray(
env.TRADE_DIARY_OWNER_EMAILS
)
){
list.push(
...env.TRADE_DIARY_OWNER_EMAILS
);
}

if(
!list.length &&
env.SYSTEM_ADMIN_EMAIL
){
list.push(
env.SYSTEM_ADMIN_EMAIL
);
}

return [
...new Set(
list.map(
normalizeEmail
).filter(
Boolean
)
)
];

}catch{

return [];

}

}

export function isLoggedInEffective(){

return isCloudLoggedInEffective();

}

export async function isTradeDiaryOwner(){

if(
!isDesktopTradeDiaryContext()
){
return false;
}

if(
!isLoggedInEffective()
){
return false;
}

const email =
normalizeEmail(
getEffectiveCloudUserEmail()
);

if(
!email
){
return false;
}

const owners =
await getTradeDiaryOwnerEmails();

return owners.includes(
email
);

}
