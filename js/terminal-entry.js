/**
 * @module coins-page
 * Canonical entry script for `/terminal.html` («Монеты»).
 *
 * Implementation lives in `terminal.js` (legacy filename).
 * Do not confuse with `/terminal.html` — that page loads `watchlist.js`.
 */
import {
jsUrl
} from "./asset-manifest.js?v=8";

await import(
jsUrl(
"terminal.js"
)
);
