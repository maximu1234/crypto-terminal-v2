#!/usr/bin/env node
/**
 * Копирует статику сайта из корня репо → desktop/site-bundle/
 * (тот же код, что на Vercel — отдельная копия внутри .app).
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
execFileSync
} =
require(
"child_process"
);

const DESKTOP_ROOT =
path.join(
__dirname,
".."
);
const REPO_ROOT =
path.join(
DESKTOP_ROOT,
".."
);
const OUT =
path.join(
DESKTOP_ROOT,
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

function rimraf(
dir
){

fs.rmSync(
dir,
{
recursive:
true,
force:
true
}
);

}

function ensureDir(
dir
){

fs.mkdirSync(
dir,
{
recursive:
true
}
);

}

function copyFile(
src,
dest
){

ensureDir(
path.dirname(
dest
)
);
fs.copyFileSync(
src,
dest
);

}

function copyDir(
src,
dest
){

if(
!fs.existsSync(
src
)
){
return;
}

ensureDir(
dest
);

for(
const name of
fs.readdirSync(
src
)
){

const from =
path.join(
src,
name
);
const to =
path.join(
dest,
name
);

if(
fs.statSync(
from
).isDirectory()
){
copyDir(
from,
to
);
}else{
fs.copyFileSync(
from,
to
);
}

}

}

function prepareSupabaseEnv(){

const writer =
path.join(
REPO_ROOT,
"scripts",
"write-supabase-env.cjs"
);

if(
!fs.existsSync(
writer
)
){
return;
}

try{
execFileSync(
process.execPath,
[
writer
],
{
cwd:
REPO_ROOT,
stdio:
"inherit",
env:
process.env
}
);
}catch(
err
){
console.warn(
"bundle-site: write-supabase-env failed:",
err.message
);
}

const envFile =
path.join(
REPO_ROOT,
"js",
"supabase-env.js"
);

if(
fs.existsSync(
envFile
)
){
return;
}

}

function writeBundleMeta(){

const meta =
{
builtAt:
new Date().toISOString(),
source:
"crypto-terminal-v2",
bundleVersion:
2
};

fs.writeFileSync(
path.join(
OUT,
"bundle-meta.json"
),
JSON.stringify(
meta,
null,
2
),
"utf8"
);

}

function main(){

console.log(
"bundle-site →",
OUT
);

prepareSupabaseEnv();

rimraf(
OUT
);
ensureDir(
OUT
);

for(
const dir of
COPY_DIRS
){
copyDir(
path.join(
REPO_ROOT,
dir
),
path.join(
OUT,
dir
)
);
}

const envSrc =
path.join(
REPO_ROOT,
"js",
"supabase-env.js"
);

if(
fs.existsSync(
envSrc
)
){
copyFile(
envSrc,
path.join(
OUT,
"js",
"supabase-env.js"
)
);

}

for(
const name of
fs.readdirSync(
REPO_ROOT
)
){

if(
!name.endsWith(
".html"
)
){
continue;
}

copyFile(
path.join(
REPO_ROOT,
name
),
path.join(
OUT,
name
)
);

}

for(
const rel of
NESTED_PAGES
){

const src =
path.join(
REPO_ROOT,
rel
);

if(
fs.existsSync(
src
)
){
copyFile(
src,
path.join(
OUT,
rel
)
);
}

}

writeBundleMeta();

console.log(
"bundle-site: done"
);

}

main();
