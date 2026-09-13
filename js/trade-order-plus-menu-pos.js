/**
 * Plus-button dropdown position relative to the chart wrap.
 * Independent of CSS so iPad Safari can place the menu before layout.
 */

const FALLBACK_MENU_W =
140;

const FALLBACK_MENU_H =
120;

const GAP_PX =
8;

const EDGE_PX =
4;

export function computePlusMenuPosition({
wrapWidth,
wrapHeight,
plusLeft,
plusTop,
plusWidth,
plusHeight,
menuWidth,
menuHeight
}){

const menuW =
Number.isFinite(
menuWidth
) &&
menuWidth >=
8 &&
menuWidth <
wrapWidth *
0.9
? menuWidth
: FALLBACK_MENU_W;

const menuH =
Number.isFinite(
menuHeight
) &&
menuHeight >=
8 &&
menuHeight <
wrapHeight *
0.95
? menuHeight
: FALLBACK_MENU_H;

let left =
plusLeft -
menuW -
GAP_PX;

let top =
plusTop +
(
plusHeight /
2
) -
(
menuH /
2
);

const maxTop =
Math.max(
EDGE_PX,
wrapHeight -
menuH -
EDGE_PX
);

left =
Math.max(
EDGE_PX,
left
);

top =
Math.max(
EDGE_PX,
Math.min(
top,
maxTop
)
);

return {
left,
top
};

}
