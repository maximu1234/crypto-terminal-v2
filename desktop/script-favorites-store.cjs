/**
 * Script favorites symbol lists — per exchange and side in userData.
 * Names: script-favorites-bybit-long.txt, script-favorites-bybit-short.txt
 * Legacy (migrated → long): script-favorites-bybit.txt
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
app,
dialog,
BrowserWindow
} =
require(
"electron"
);

function normalizeExchangeId(
exchangeId
){

const id =
String(
exchangeId ||
""
).trim().toLowerCase();

return id ===
"bingx"
? "bingx"
: "bybit";

}

function normalizeSide(
side
){

const s =
String(
side ||
""
).trim().toLowerCase();

return s ===
"short"
? "short"
: "long";

}

function fileNameForExchange(
exchangeId,
side
){

return `script-favorites-${normalizeExchangeId(
exchangeId
)}-${normalizeSide(
side
)}.txt`;

}

function legacyFileNameForExchange(
exchangeId
){

return `script-favorites-${normalizeExchangeId(
exchangeId
)}.txt`;

}

function storePath(
exchangeId,
side
){

return path.join(
app.getPath(
"userData"
),
fileNameForExchange(
exchangeId,
side
)
);

}

function legacyStorePath(
exchangeId
){

return path.join(
app.getPath(
"userData"
),
legacyFileNameForExchange(
exchangeId
)
);

}

function migrateLegacyToLong(
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId
);
const longPath =
storePath(
ex,
"long"
);
const legacyPath =
legacyStorePath(
ex
);

try{
if(
fs.existsSync(
longPath
) ||
!fs.existsSync(
legacyPath
)
){
return;
}

fs.renameSync(
legacyPath,
longPath
);
}catch{
try{
const text =
fs.readFileSync(
legacyPath,
"utf8"
);
fs.writeFileSync(
longPath,
text,
{
encoding:
"utf8",
mode:
0o600
}
);
fs.unlinkSync(
legacyPath
);
}catch{
/* ignore migration failures */
}
}

}

function readText(
exchangeId,
side
){

const ex =
normalizeExchangeId(
exchangeId
);
const s =
normalizeSide(
side
);

if(
s ===
"long"
){
migrateLegacyToLong(
ex
);
}

const filePath =
storePath(
ex,
s
);

try{
if(
!fs.existsSync(
filePath
)
){
return {
ok:
true,
exists:
false,
side:
s,
fileName:
fileNameForExchange(
ex,
s
),
filePath,
mtimeMs:
0,
text:
""
};
}

const text =
fs.readFileSync(
filePath,
"utf8"
);
let mtimeMs =
0;

try{
mtimeMs =
fs.statSync(
filePath
).mtimeMs;
}catch{
mtimeMs =
0;
}

return {
ok:
true,
exists:
true,
side:
s,
fileName:
fileNameForExchange(
ex,
s
),
filePath,
mtimeMs,
text:
String(
text ||
""
)
};
}catch(
err
){
return {
ok:
false,
exists:
false,
side:
s,
fileName:
fileNameForExchange(
ex,
s
),
filePath,
text:
"",
message:
err?.message ||
String(
err
)
};
}

}

function writeText(
exchangeId,
side,
text
){

const ex =
normalizeExchangeId(
exchangeId
);
const s =
normalizeSide(
side
);
const filePath =
storePath(
ex,
s
);

try{
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
String(
text ||
""
),
{
encoding:
"utf8",
mode:
0o600
}
);

return {
ok:
true,
exists:
true,
side:
s,
fileName:
fileNameForExchange(
ex,
s
),
filePath,
text:
String(
text ||
""
)
};
}catch(
err
){
return {
ok:
false,
side:
s,
message:
err?.message ||
String(
err
)
};
}

}

function clearText(
exchangeId,
side
){

const ex =
normalizeExchangeId(
exchangeId
);
const s =
normalizeSide(
side
);
const filePath =
storePath(
ex,
s
);

try{
if(
fs.existsSync(
filePath
)
){
fs.unlinkSync(
filePath
);
}

return {
ok:
true,
exists:
false,
side:
s,
fileName:
fileNameForExchange(
ex,
s
),
filePath,
text:
""
};
}catch(
err
){
return {
ok:
false,
side:
s,
message:
err?.message ||
String(
err
)
};
}

}

async function importFromDialog(
exchangeId,
side
){

const ex =
normalizeExchangeId(
exchangeId
);
const s =
normalizeSide(
side
);
const sideLabel =
s ===
"short"
? "Short"
: "Long";
const browserWindow =
BrowserWindow.getFocusedWindow();
const {
canceled,
filePaths
} =
await dialog.showOpenDialog(
browserWindow ||
undefined,
{
title:
`Избранные ${sideLabel} для Скрипта`,
properties:
[
"openFile"
],
filters:
[
{
name:
"Text",
extensions:
[
"txt",
"csv"
]
},
{
name:
"All files",
extensions:
[
"*"
]
}
]
}
);

if(
canceled ||
!filePaths?.length
){
return {
ok:
false,
canceled:
true,
side:
s
};
}

const sourcePath =
filePaths[
0
];

let text =
"";

try{
text =
fs.readFileSync(
sourcePath,
"utf8"
);
}catch(
err
){
return {
ok:
false,
side:
s,
message:
err?.message ||
String(
err
)
};
}

const saved =
writeText(
ex,
s,
text
);

if(
!saved.ok
){
return saved;
}

return {
...saved,
sourcePath,
sourceName:
path.basename(
sourcePath
)
};

}

module.exports =
{
normalizeExchangeId,
normalizeSide,
fileNameForExchange,
legacyFileNameForExchange,
storePath,
readText,
writeText,
clearText,
importFromDialog
};
