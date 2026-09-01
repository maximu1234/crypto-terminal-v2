/**
 * Local L2 order book — snapshot + delta (size 0 = delete).
 * Tick-indexed; toBook() sorts only for tests / rare callers.
 */
export {
createTickBook as createLiveBook,
createTickBook,
inferTickFromLevels,
priceToTickIndex,
tickIndexToPrice
} from "./tick-book.js?v=3";
