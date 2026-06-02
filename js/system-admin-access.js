import {
isCloudLoggedInEffective,
getEffectiveCloudUserEmail
} from "./cloud-sync.js?v=31";

function normalizeEmail(raw){

return String(raw || "").trim().toLowerCase();

}

export async function getSystemAdminEmails(){

try{

const env =
await import("./supabase-env.js?v=5");

const list = [];

if(
Array.isArray(env.SYSTEM_ADMIN_EMAILS)
){
list.push(...env.SYSTEM_ADMIN_EMAILS);
}

const single =
env.SYSTEM_ADMIN_EMAIL;

if(
single
){
list.push(single);
}

return [
...new Set(
list.map(normalizeEmail).filter(Boolean)
)
];

}catch{

return [];

}

}

export function isLoggedInEffective(){

return isCloudLoggedInEffective();

}

export async function isSystemAdminUser(){

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

const admins =
await getSystemAdminEmails();

return admins.includes(email);

}
