/**
 * Desktop algo edition letter (baked into each .app build).
 * f = full (live + manual)
 * m = manual-only (friends build — live forced off)
 *
 * Change THIS value before packaging the friends build.
 * Main passes it into sandboxed preload via `--algo-desktop-edition=`.
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
