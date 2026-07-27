#!/usr/bin/env node
/**
 * electron-builder / npm require valid semver. Project desktop versions may use
 * a leading-zero patch (1.1.01 after 1.0.99). Normalize only for CI build.
 *
 *   node scripts/desktop-build-semver.cjs           # rewrite desktop/package.json
 *   node scripts/desktop-build-semver.cjs --print   # stdout build semver only
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);

const pkgPath =
path.join(
__dirname,
"..",
"desktop",
"package.json"
);

/**
 * @param {string} version
 * @returns {string}
 */
function toDesktopBuildSemver(
version
){

const raw =
String(
version ||
""
).trim();
const parts =
raw.split(
"."
);

if(
parts.length !==
3
){
return raw;
}

const patch =
parts[
2
];

if(
/^0\d+$/.test(
patch
)
){
parts[
2
] =
String(
parseInt(
patch,
10
)
);
return parts.join(
"."
);
}

return raw;

}

const pkg =
JSON.parse(
fs.readFileSync(
pkgPath,
"utf8"
)
);
const sourceVersion =
pkg.version;
const buildVersion =
toDesktopBuildSemver(
sourceVersion
);

if(
process.argv.includes(
"--print"
)
){
process.stdout.write(
buildVersion
);
process.exit(
0
);
}

if(
buildVersion !==
sourceVersion
){
pkg.version =
buildVersion;
fs.writeFileSync(
pkgPath,
`${JSON.stringify(
pkg,
null,
2
)}\n`
);
console.log(
`desktop build semver: ${buildVersion} (from ${sourceVersion})`
);
}else{
console.log(
`desktop build semver unchanged: ${buildVersion}`
);
}

module.exports =
{
toDesktopBuildSemver
};
