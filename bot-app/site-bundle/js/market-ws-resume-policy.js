const CATCHUP_PAGE_BARS =
900;

const CATCHUP_MAX_PAGES =
8;

export const STALE_PERIODS =
1.5;

export const MOBILE_HIDDEN_MS =
800;

export const DESKTOP_WEB_HIDDEN_MS =
15_000;

export function shouldCatchupFromBackground({
isDesktop = false,
visible = false,
hiddenMs = 0,
appleMobile = false
} = {}){

if(
isDesktop ||
!visible
){
return false;
}

const minHidden =
appleMobile
? MOBILE_HIDDEN_MS
: DESKTOP_WEB_HIDDEN_MS;

return Number(hiddenMs) >= minHidden;

}

export function catchupHistoryPages(
lastTimeSec,
periodSec,
nowSec = Date.now() / 1000
){

const period =
Math.max(
1,
Math.floor(
Number(periodSec) ||
0
)
);
const last =
Number(lastTimeSec);
const now =
Number(nowSec);

if(
!Number.isFinite(last) ||
!Number.isFinite(now)
){
return 1;
}

const behind =
Math.max(
0,
(now - last) / period
);

return Math.min(
CATCHUP_MAX_PAGES,
Math.max(
1,
Math.ceil(
(behind + 2) / CATCHUP_PAGE_BARS
)
)
);

}
