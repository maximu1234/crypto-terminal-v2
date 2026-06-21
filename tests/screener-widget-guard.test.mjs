import test from "node:test";
import assert from "node:assert/strict";

import {
isScreenerWidgetCurrent
} from "../js/screener-widget-guard.js";

test(
"isScreenerWidgetCurrent: alive widget on current page",
()=>{

const widget =
{
disposed:
false,
loadId:
3
};

const active =
[
widget
];

assert.equal(
isScreenerWidgetCurrent(
widget,
3,
active
),
true
);

}
);

test(
"isScreenerWidgetCurrent: rejects disposed widget",
()=>{

const widget =
{
disposed:
true,
loadId:
3
};

assert.equal(
isScreenerWidgetCurrent(
widget,
3,
[
widget
]
),
false
);

}
);

test(
"isScreenerWidgetCurrent: rejects stale renderToken",
()=>{

const widget =
{
disposed:
false,
loadId:
2
};

assert.equal(
isScreenerWidgetCurrent(
widget,
3,
[
widget
]
),
false
);

}
);

test(
"isScreenerWidgetCurrent: rejects widget not in active list",
()=>{

const widget =
{
disposed:
false,
loadId:
3
};

assert.equal(
isScreenerWidgetCurrent(
widget,
3,
[]
),
false
);

}
);
