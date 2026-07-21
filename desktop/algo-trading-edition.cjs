/**
 * Desktop algo edition letter (baked into each .app / .exe build).
 * f = full (live + manual)
 * m = manual-only (friends build — live forced off)
 *
 * Dual CI build rewrites ALGO_DESKTOP_EDITION before each package.
 * Do not read process.env here — Electron runtime has no build env.
 */
const ALGO_DESKTOP_EDITION =
"f";

function normalizeAlgoDesktopEdition(
raw
){

return raw ===
"m"
? "m"
: "f";

}

function getAlgoDesktopEdition(){

return normalizeAlgoDesktopEdition(
ALGO_DESKTOP_EDITION
);

}

function isAlgoLiveTradingEnabled(){

return getAlgoDesktopEdition() ===
"f";

}

module.exports =
{
ALGO_DESKTOP_EDITION,
getAlgoDesktopEdition,
isAlgoLiveTradingEnabled,
normalizeAlgoDesktopEdition
};
