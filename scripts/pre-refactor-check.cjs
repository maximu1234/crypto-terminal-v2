#!/usr/bin/env node
/**
 * Полный gate перед/после фаз refactor drawings.
 * Запуск: npm run check:all
 */
const {
execSync
} =
require(
"child_process"
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

function run(
cmd,
label
){

console.log(
`\n▶ ${label}`
);
execSync(
cmd,
{
cwd: ROOT,
stdio: "inherit"
}
);

}

function syntaxCheck(){

console.log(
`\n▶ Syntax check JS`
);

execSync(
`find . -name '*.js' -not -path './node_modules/*' -not -path './desktop/node_modules/*' -not -path './bot-app/node_modules/*' -not -path './vendor/*' | while read f; do node --check "$f" || exit 1; done`,
{
cwd: ROOT,
stdio: "inherit",
shell: "/bin/bash"
}
);

}

try{

syntaxCheck();

run(
"node scripts/check-asset-manifest.cjs",
"Asset manifest"
);

run(
"node scripts/check-desktop-bundle.cjs",
"Desktop bundle"
);

run(
"node scripts/check-bot-lite-bundle.cjs",
"Algo Bot lite bundle"
);

run(
"node desktop/scripts/check-packaged-requires.cjs",
"Desktop packaged requires"
);

run(
"node scripts/check-site-nav.cjs",
"Site nav"
);

run(
"node scripts/test-ci-parity.cjs",
"Unit tests (CI parity: no desktop/node_modules)"
);

console.log(
"\n✓ check:all OK"
);
process.exit(
0
);

}catch(
err
){

console.error(
"\n✗ check:all FAILED"
);
process.exit(
1
);

}
