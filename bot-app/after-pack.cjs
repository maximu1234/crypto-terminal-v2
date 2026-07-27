/**
 * Ad-hoc sign before .dmg/.zip — без Apple ID. Убирает «повреждено» от битой подписи CI.
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

exports.default =
async function afterPack(
context
){

if(
context.electronPlatformName !==
"darwin"
){
return;
}

const appPath =
path.join(
context.appOutDir,
`${context.packager.appInfo.productFilename}.app`
);

execSync(
`codesign --force --deep --sign - ${JSON.stringify(appPath)}`,
{
stdio:
"inherit"
}
);

};
