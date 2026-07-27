/**
 * Supabase auth session — persist outside page origin (desktop updates / port changes).
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
writeSecretText
} =
require(
"./user-store.cjs"
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

function readStore(){

return readPlainWithLegacyMigration(
storePath()
);

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

writeSecretText(
storePath(),
raw
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
