/**
 * Фабрика platform adapter: darwin | win32.
 */

const shared =
require(
"./shared.cjs"
);

function loadPlatformImpl(){

const platform =
process.platform;

if(
platform ===
"darwin"
){
return require(
"./darwin.cjs"
);
}

if(
platform ===
"win32"
){
return require(
"./win32.cjs"
);
}

/*
  Linux/dev fallback — поведение как Windows (quit при закрытии окон).
*/
return require(
"./win32.cjs"
);

}

const platformImpl =
loadPlatformImpl();

module.exports = {
...shared,
platform:
platformImpl.id,
impl:
platformImpl,
loadPlatformImpl
};
