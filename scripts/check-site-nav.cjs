#!/usr/bin/env node
/**
 * Проверяет, что site-nav-page HTML содержит все ссылки из docs/partials/site-nav.html.
 * Запуск: node scripts/check-site-nav.cjs
 */
const fs =
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
const PARTIAL =
path.join(
ROOT,
"docs/partials/site-nav.html"
);

const required =
fs
.readFileSync(
PARTIAL,
"utf8"
)
.match(
/href="[^"]+"/g
)
.map(
s=>
s.slice(
6,
-1
)
);

const pages =
[
"alerts/index.html",
"listings.html",
"trade-calculator.html",
"statistics.html",
"system/index.html"
];

let ok =
true;

for(
const rel of
pages
){

const html =
fs.readFileSync(
path.join(
ROOT,
rel
),
"utf8"
);

for(
const href of
required
){

if(
!html.includes(
href
)
){
console.error(
`site-nav missing ${href} in ${rel}`
);
ok =
false;
}

}

}

if(
!ok
){
process.exit(
1
);
}

console.log(
`site-nav OK (${pages.length} pages, ${required.length} links)`
);
