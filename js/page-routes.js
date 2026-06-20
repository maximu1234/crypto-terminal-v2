/**
 * @module page-routes
 * Единое определение «на какой странице мы» — pathname без query/hash.
 */

/** @returns {string} */
export function pagePath(){

return typeof location !==
"undefined"
? (
location.pathname ||
""
)
: "";

}

/** @param {RegExp} re */
function pathMatches(
re
){

return re.test(
pagePath()
);

}

export function isAlertsPage(){

return pathMatches(
/\/alerts(\.html)?\/?$/i
);

}

export function isTradePage(){

const path =
pagePath();

if(
pathMatches(
/\/trade(\.html)?\/?$/i
)
){
return true;
}

if(
!pathMatches(
/\/coins(\.html)?\/?$/i
)
){
return false;
}

return !!(
typeof globalThis !==
"undefined" &&
globalThis.window?.cryptoTerminalDesktop?.isDesktop
);

}

export function isCoinsPage(){

return (
pathMatches(
/\/coins(\.html)?\/?$/i
) ||
isTradePage()
);

}

export function isCoinsPageOnly(){

return pathMatches(
/\/coins(\.html)?\/?$/i
);

}

export function isTerminalDashboardPage(){

return pathMatches(
/\/terminal(\.html)?\/?$/i
);

}

export function isScreenerPage(){

const path =
pagePath();

return (
path ===
"/" ||
path ===
"" ||
pathMatches(
/^\/index(\.html)?\/?$/i
)
);

}

export function isListingsPage(){

return pathMatches(
/\/listings(\.html)?\/?$/i
);

}

export function isTradeCalculatorPage(){

return pathMatches(
/\/trade-calculator(\.html)?\/?$/i
);

}

export function isStatisticsPage(){

return pathMatches(
/\/statistics(\.html)?\/?$/i
);

}

export function isSystemAdminPage(){

return pathMatches(
/\/system(\.html)?\/?$/i
);

}

/** Страницы с canvas рисования (coins, dashboard, screener widgets). */
export function isDrawingsUiPage(){

return (
isCoinsPage() ||
isTerminalDashboardPage() ||
isScreenerPage()
);

}
