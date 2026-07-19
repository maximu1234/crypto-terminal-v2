#!/usr/bin/env node
/**
 * Unit tests in CI-like conditions: hide desktop/node_modules so requires
 * like electron-log / electron from desktop/*.cjs fail locally the same way
 * they fail on GitHub Actions (no desktop npm install).
 *
 * Recurring first-push CI breaks: tests import desktop modules that resolve
 * Electron deps only because desktop/node_modules exists on the agent machine.
 */
const {
execSync
} =
require(
"child_process"
);
const {
existsSync,
renameSync
} =
require(
"fs"
);
const path =
require(
"path"
);

const ROOT =
path.join(
__dirname,
".."
);
const NM =
path.join(
ROOT,
"desktop",
"node_modules"
);
const NM_BAK =
path.join(
ROOT,
"desktop",
"node_modules.ci-parity-bak"
);

let moved =
false;

function restore(){

if(
!moved
){
return;
}

try{
if(
existsSync(
NM_BAK
) &&
!existsSync(
NM
)
){
renameSync(
NM_BAK,
NM
);
}
}catch(
err
){
console.error(
"test:ci-parity: failed to restore desktop/node_modules:",
err?.message ||
err
);
}

moved =
false;

}

process.on(
"exit",
restore
);
process.on(
"SIGINT",
()=>{
restore();
process.exit(
130
);
}
);
process.on(
"SIGTERM",
()=>{
restore();
process.exit(
143
);
}
);

let failed =
false;

try{
if(
existsSync(
NM
) &&
!existsSync(
NM_BAK
)
){
renameSync(
NM,
NM_BAK
);
moved =
true;
console.log(
"test:ci-parity: hid desktop/node_modules"
);
}

execSync(
"node --test tests/*.test.mjs",
{
cwd:
ROOT,
stdio:
"inherit",
shell:
true
}
);
}catch{
failed =
true;
}finally{
restore();
}

process.exit(
failed
? 1
: 0
);
