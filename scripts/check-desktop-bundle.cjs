#!/usr/bin/env node
/**
 * Проверяет, что desktop/site-bundle совпадает с исходниками сайта.
 * При drift: npm run bundle:sync
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const crypto =
require(
"crypto"
);

const ROOT =
path.join(
__dirname,
".."
);
const BUNDLE =
path.join(
ROOT,
"desktop",
"site-bundle"
);

const COPY_DIRS =
[
"js",
"css",
"vendor",
"assets",
"icons",
"sounds"
];

const NESTED_PAGES =
[
"alerts/index.html",
"system/index.html"
];

function sha256(
filePath
){

return crypto
.createHash(
"sha256"
)
.update(
fs.readFileSync(
filePath
)
)
.digest(
"hex"
);

}

function walkDir(
dir
){

const out =
[];

for(
const ent of
fs.readdirSync(
dir,
{
withFileTypes:
true
}
)
){

const full =
path.join(
dir,
ent.name
);

if(
ent.isDirectory()
){
out.push(
...walkDir(
full
)
);
}else{
out.push(
full
);
}

}

return out;

}

function expectedFiles(){

const files =
new Set();

for(
const dir of
COPY_DIRS
){

const abs =
path.join(
ROOT,
dir
);

if(
!fs.existsSync(
abs
)
){
continue;
}

for(
const full of
walkDir(
abs
)
){
files.add(
path.relative(
ROOT,
full
).split(
path.sep
).join(
"/"
)
);
}

}

for(
const name of
fs.readdirSync(
ROOT
)
){

if(
name.endsWith(
".html"
)
){
files.add(
name
);
}

}

for(
const rel of
NESTED_PAGES
){
files.add(
rel
);
}

return [
...files
].sort();

}

function main(){

if(
!fs.existsSync(
BUNDLE
)
){
console.error(
"desktop/site-bundle missing — run: npm run bundle:sync"
);
process.exit(
1
);
}

const files =
expectedFiles();
let mismatches =
0;

for(
const rel of
files
){

const src =
path.join(
ROOT,
rel
);
const dst =
path.join(
BUNDLE,
rel
);

if(
!fs.existsSync(
src
)
){
continue;
}

if(
!fs.existsSync(
dst
)
){
console.error(
`bundle missing: ${rel}`
);
mismatches++;
continue;
}

if(
sha256(
src
) !==
sha256(
dst
)
){
console.error(
`bundle drift: ${rel}`
);
mismatches++;
}

}

if(
mismatches
){
console.error(
`\n${mismatches} drift(s). Run: npm run bundle:sync`
);
process.exit(
1
);
}

console.log(
`desktop bundle OK (${files.length} files)`
);

}

main();
