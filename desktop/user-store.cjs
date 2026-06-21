/**
 * userData persistence without macOS Keychain prompts.
 * Legacy Electron safeStorage blobs are migrated to plain UTF-8 on first read
 * (may prompt once for existing installs, then never again).
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
safeStorage
} =
require(
"electron"
);

function looksLikePlainUtf8(
buf
){

if(
!buf?.length
){
return false;
}

if(
buf.includes(
0
)
){
return false;
}

try{
const text =
buf.toString(
"utf8"
);
return text.trim().length >
0;
}catch{
return false;
}

}

function writePlain(
filePath,
text
){

fs.mkdirSync(
path.dirname(
filePath
),
{
recursive:
true
}
);
fs.writeFileSync(
filePath,
Buffer.from(
String(
text
),
"utf8"
),
{
mode:
0o600
}
);

}

function readPlainWithLegacyMigration(
filePath
){

if(
!fs.existsSync(
filePath
)
){
return null;
}

const raw =
fs.readFileSync(
filePath
);

if(
!raw.length
){
return null;
}

if(
looksLikePlainUtf8(
raw
)
){
return raw.toString(
"utf8"
);
}

if(
safeStorage.isEncryptionAvailable()
){
try{
const decrypted =
safeStorage.decryptString(
raw
);

if(
typeof decrypted ===
"string" &&
decrypted.trim()
){
writePlain(
filePath,
decrypted
);
return decrypted;
}
}catch{
/* fall through */
}
}

return null;

}

module.exports =
{
readPlainWithLegacyMigration,
writePlain
};
