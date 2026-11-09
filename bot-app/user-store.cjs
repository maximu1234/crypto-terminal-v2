/**
 * userData persistence. Secrets use Electron safeStorage when the OS reports
 * it (macOS Keychain, Windows DPAPI, Linux). Plaintext UTF-8 remains only if
 * encryption is unavailable. An existing plaintext file is re-encrypted on read.
 *
 * On read, decrypt FIRST — encrypted blobs can look like UTF-8 without NUL
 * bytes and must not be treated as plain.
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

function isCredentialEncryptionAvailable(){

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
const text =
raw.toString(
"utf8"
);
writeSecretText(
filePath,
text
);
return text;
}

return null;
}

/* Encryption unavailable: plaintext, then migrate legacy safeStorage blobs. */
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
