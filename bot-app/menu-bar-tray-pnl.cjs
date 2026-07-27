/**
 * Unrealised PnL helpers for menu-bar tray (match Terminal positions-cache).
 * No Electron deps — safe for unit tests on CI.
 */

function calcUnrealisedPnl(
side,
avgPrice,
markPrice,
size
){

const e =
Number(
avgPrice
);
const m =
Number(
markPrice
);
const s =
Number(
size
);

if(
!Number.isFinite(
e
) ||
!Number.isFinite(
m
) ||
!Number.isFinite(
s
) ||
s ===
0 ||
e <=
0 ||
m <=
0
){
return null;
}

return side ===
"Buy"
? (
m -
e
) *
s
: (
e -
m
) *
s;

}

function resolvePositionPnl(
row
){

const fromMark =
calcUnrealisedPnl(
row?.side,
row?.avgPrice,
row?.markPrice,
row?.size
);

if(
fromMark !=
null
){
return fromMark;
}

const raw =
Number(
row?.pnl
);

return Number.isFinite(
raw
)
? raw
: null;

}

function withResolvedPnl(
row
){

const pnl =
resolvePositionPnl(
row
);

return {
...row,
pnl
};

}

module.exports =
{
calcUnrealisedPnl,
resolvePositionPnl,
withResolvedPnl
};
