import test from "node:test";
import assert from "node:assert/strict";

import {
createEmptyAlgoGlobalAgg,
addAlgoTradeStatsToAgg
} from "../js/algo-trading/ticker-scan-all-stats.js";

test("addAlgoTradeStatsToAgg sums counts and usd", () => {
	const acc = createEmptyAlgoGlobalAgg();

	addAlgoTradeStatsToAgg(acc, {
		longWins: 2,
		longLosses: 1,
		shortWins: 3,
		shortLosses: 4,
		longWinUsd: 12,
		longLossUsd: 2,
		shortWinUsd: 18,
		shortLossUsd: 8,
		longNetUsd: 10,
		shortNetUsd: -5,
		netUsd: 5,
		profitUsd: 20,
		lossUsd: 15
	});
	addAlgoTradeStatsToAgg(acc, {
		longWins: 1,
		longLosses: 0,
		shortWins: 0,
		shortLosses: 1,
		longWinUsd: 3.5,
		longLossUsd: 0,
		shortWinUsd: 0,
		shortLossUsd: 1,
		longNetUsd: 3.5,
		shortNetUsd: -1,
		netUsd: 2.5,
		profitUsd: 3.5,
		lossUsd: 1
	});
	addAlgoTradeStatsToAgg(acc, null);

	assert.equal(acc.longWins, 3);
	assert.equal(acc.longLosses, 1);
	assert.equal(acc.shortWins, 3);
	assert.equal(acc.shortLosses, 5);
	assert.equal(acc.longWinUsd, 15.5);
	assert.equal(acc.longLossUsd, 2);
	assert.equal(acc.shortWinUsd, 18);
	assert.equal(acc.shortLossUsd, 9);
	assert.equal(acc.longNetUsd, 13.5);
	assert.equal(acc.shortNetUsd, -6);
	assert.equal(acc.netUsd, 7.5);
});
