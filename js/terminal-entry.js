/**
 * @module terminal-page
 * Canonical entry for `/terminal.html` (Терминал).
 *
 * Implementation lives in `terminal.js`.
 * Watchlist widgets live in `watchlist.js` on `/watchlist.html`.
 */
import {
jsUrl
} from "./asset-manifest.js?v=7bc89a39";

await import(
jsUrl(
"terminal.js"
)
);
