/**
 * @module terminal-page
 * Canonical entry for `/terminal.html` (Терминал).
 *
 * Implementation lives in `terminal.js`.
 * Watchlist widgets live in `watchlist.js` on `/watchlist.html`.
 */
import {
jsUrl
} from "./asset-manifest.js?v=af54e7fa";

await import(
jsUrl(
"terminal.js"
)
);
