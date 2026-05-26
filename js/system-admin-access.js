import {
isCloudLoggedIn,
getCloudUserEmail
} from "./cloud-sync.js?v=13";

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

export async function isSystemAdminUser(){

if(
!isCloudLoggedIn()
){
return false;
}

const email =
normalizeEmail(
getCloudUserEmail()
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
