/**
 * @module coins-page
 * Canonical entry script for `/coins.html` («Монеты»).
 *
 * Implementation lives in `terminal.js` (legacy filename).
 * Do not confuse with `/terminal.html` — that page loads `dashboard.js`.
 */
import {
jsUrl
} from "./asset-manifest.js?v=2";

await import(
jsUrl(
"terminal.js"
)
);
