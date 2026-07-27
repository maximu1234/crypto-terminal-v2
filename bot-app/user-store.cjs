/**
 * userData persistence. Prefer OS encryption off macOS (no Keychain prompts);
 * on darwin keep plaintext UTF-8 with mode 0o600. Legacy safeStorage blobs
 * decrypt on read; re-encrypted on next save when encryption is available.
 *
 * Windows/Linux: encrypt with safeStorage. On read, decrypt FIRST — encrypted
 * blobs can look like UTF-8 without NUL bytes and must not be treated as plain.
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

/**
 * macOS Keychain prompts made safeStorage painful — skip encrypt there.
 * Windows/Linux: use OS encryption when Electron reports it available.
 */
function isCredentialEncryptionAvailable(){

if(
process.platform ===
"darwin"
){
return false;
}

try{
return !!safeStorage.isEncryptionAvailable();
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

function tryDecryptSecret(
raw
){

try{
if(
!safeStorage.isEncryptionAvailable()
){
return null;
}

const decrypted =
safeStorage.decryptString(
raw
);

if(
typeof decrypted ===
"string" &&
decrypted.trim()
){
return decrypted;
}
}catch{
/* not an encrypted blob / DPAPI failure */
}

return null;

}

function writeSecretText(
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

const payload =
String(
text
);

if(
isCredentialEncryptionAvailable()
){
try{
const encrypted =
safeStorage.encryptString(
payload
);
fs.writeFileSync(
filePath,
encrypted,
{
mode:
0o600
}
);
return;
}catch{
/* fall through to plaintext */
}
}

writePlain(
filePath,
payload
);

}

function readSecretText(
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

/*
 * When OS encryption is on (Windows/Linux), try decrypt first.
 * Encrypted buffers often have no NUL and decode as non-empty UTF-8,
 * so plaintext-first mis-reads them as garbage → keys look "missing".
 */
if(
isCredentialEncryptionAvailable()
){
const decrypted =
tryDecryptSecret(
raw
);

if(
decrypted
){
return decrypted;
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

return null;
}

/* Darwin / no-encrypt: plaintext, then migrate legacy safeStorage blobs. */
if(
looksLikePlainUtf8(
raw
)
){
return raw.toString(
"utf8"
);
}

const legacy =
tryDecryptSecret(
raw
);

if(
legacy
){
writePlain(
filePath,
legacy
);
return legacy;
}

return null;

}

module.exports =
{
isCredentialEncryptionAvailable,
readPlainWithLegacyMigration:
readSecretText,
writePlain,
writeSecretText,
readSecretText
};
