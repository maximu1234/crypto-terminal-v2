/**
 * Supabase auth session — persist outside page origin (desktop updates / port changes).
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
"cloud-auth-session.json";

function storePath(){

return path.join(
app.getPath(
"userData"
),
STORE_NAME
);

}

function canEncrypt(){

return safeStorage.isEncryptionAvailable();

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
return safeStorage.decryptString(
raw
);
}

return raw.toString(
"utf8"
);
}catch{
return null;
}

}

function writeStore(
raw
){

if(
typeof raw !==
"string" ||
!raw.trim()
){
return false;
}

const buf =
canEncrypt()
? safeStorage.encryptString(
raw
)
: Buffer.from(
raw,
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
return true;

}

function clearStore(){

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
"Failed to clear auth session"
);
}
}

}

function getAuthSession(){

return readStore();

}

function saveAuthSession(
raw
){

return writeStore(
String(
raw ||
""
)
);

}

function clearAuthSession(){

clearStore();
return {
ok:
true
};

}

module.exports =
{
getAuthSession,
saveAuthSession,
clearAuthSession
};
