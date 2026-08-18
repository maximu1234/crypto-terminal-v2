import test from "node:test";
import assert from "node:assert/strict";

import {
resolvePatternSetupEvent,
detectPatternEntryEventsFromSetups,
ENTRY_TIMEOUT_BARS
} from "../js/algo-trading/pattern-entry-logic.js";

function c(
time,
o,
h,
l,
close
){

return {
time,
open:
o,
high:
h,
low:
l,
close
};

}

function padBefore(
n,
level =
100
){

const rows =
[];

for(
let i =
0;
i <
n;
i++
){
rows.push(
c(
i +
1,
level,
level +
1,
level -
1,
level
)
);
}

return rows;
}

test(
"long: entry on first upward cross of pt4",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
c(
7,
104,
106,
101,
102
),
c(
8,
102,
108,
100,
101
),
c(
9,
101,
112,
100,
111
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b4,
p4:
107,
p3:
95,
b3:
3
}
);

assert.equal(
event?.type,
"entry"
);
assert.equal(
event?.bar,
7
);
assert.equal(
event?.price,
107
);
assert.equal(
event?.side,
"long"
);

}
);

test(
"reverse logic flips trade side, keeps the same entry bar",
()=>{

const b4 =
5;
const setup =
{
side:
"long",
b4,
p4:
107,
p3:
95,
b3:
3
};
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
c(
7,
104,
106,
101,
102
),
c(
8,
102,
108,
100,
101
),
c(
9,
101,
112,
100,
111
)
];
const off =
detectPatternEntryEventsFromSetups(
rows,
[
setup
]
);
const on =
detectPatternEntryEventsFromSetups(
rows,
[
setup
],
{
reverseLogic:
true
}
);

assert.equal(
off[0]?.type,
"entry"
);
assert.equal(
on[0]?.type,
"entry"
);
assert.equal(
on[0]?.bar,
off[0]?.bar
);
assert.equal(
on[0]?.price,
off[0]?.price
);
assert.equal(
on[0]?.setupBar,
off[0]?.setupBar
);
assert.equal(
off[0]?.side,
"long"
);
assert.equal(
on[0]?.side,
"short"
);
assert.equal(
on[0]?.setupSide,
"long"
);

}
);

test(
"long: cancel if price goes below pt3 before entry",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
c(
7,
104,
106,
90,
100
),
c(
8,
100,
120,
99,
115
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b4,
p4:
107,
p3:
95,
b3:
3
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"below_pt3"
);
assert.equal(
event?.bar,
6
);

}
);

test(
"long: cancel after timeout window",
()=>{

const b4 =
2;
const rows =
padBefore(
b4 +
ENTRY_TIMEOUT_BARS +
3,
100
);

rows[
b4
] =
c(
b4 +
1,
100,
110,
99,
105
);

for(
let i =
b4 +
1;
i <
rows.length;
i++
){
rows[
i
] =
c(
i +
1,
100,
106,
99,
105
);
}

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b4,
p4:
107,
p3:
90,
b3:
1
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"timeout"
);
assert.equal(
event?.bar,
b4 +
ENTRY_TIMEOUT_BARS
);

}
);

test(
"short: entry on first downward cross of pt4",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4,
120
),
c(
6,
120,
121,
110,
115
),
c(
7,
116,
118,
114,
117
),
c(
8,
117,
118,
108,
109
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"short",
b4,
p4:
112,
p3:
125,
b3:
3
}
);

assert.equal(
event?.type,
"entry"
);
assert.equal(
event?.bar,
7
);
assert.equal(
event?.side,
"short"
);

}
);

test(
"short: cancel if price goes above pt3 before entry",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4,
120
),
c(
6,
120,
121,
110,
115
),
c(
7,
116,
130,
114,
125
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"short",
b4,
p4:
112,
p3:
125,
b3:
3
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"above_pt3"
);
assert.equal(
event?.bar,
6
);

}
);


test(
"long: custom timeoutBars cancels earlier",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
// stay below pt4 for 3 bars → cancel with timeoutBars=3
c(
7,
104,
106,
103,
105
),
c(
8,
104,
106,
103,
105
),
c(
9,
104,
106,
103,
105
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b4,
p3:
100,
p4:
110
},
{
timeoutBars:
3
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"timeout"
);
assert.equal(
event?.bar,
b4 +
3
);

}
);

test(
"TEMP pullback-before-arm: long skips runaway without pullback",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
/* runs up through pt4 without dipping to ~50% of X toward pt3 */
c(
7,
105,
112,
105,
111
),
c(
8,
111,
115,
110,
114
),
c(
9,
114,
118,
113,
117
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b4,
p3:
100,
p4:
110
},
{
timeoutBars:
3,
pullbackBeforeArm:
true,
pullbackBeforeArmPct:
50
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"pt4_before_pullback"
);
assert.equal(
event?.bar,
6
);

}
);

test(
"TEMP pullback-before-arm: long does not enter on second pt4 cross after pierce",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
/* first pierce of pt4 without pullback → setup dead */
c(
7,
105,
112,
105,
111
),
/* later pullback would have armed under old buggy rule */
c(
8,
111,
112,
104,
105
),
/* second cross must not become entry */
c(
9,
105,
113,
104,
112
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b4,
p3:
100,
p4:
110
},
{
timeoutBars:
10,
pullbackBeforeArm:
true,
pullbackBeforeArmPct:
50
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"pt4_before_pullback"
);

}
);

test(
"TEMP pullback-before-arm: long arms after pullback then enters on pt4",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
/* pullback toward pt3 — touches ~50% log level (~104.88) */
c(
7,
105,
106,
104,
105
),
/* still below pt4 */
c(
8,
105,
109,
104,
108
),
/* entry cross of pt4=110 */
c(
9,
108,
112,
107,
111
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b4,
p3:
100,
p4:
110
},
{
timeoutBars:
10,
pullbackBeforeArm:
true,
pullbackBeforeArmPct:
50
}
);

assert.equal(
event?.type,
"entry"
);
/* indices: 0..4 pad, 5=b4, 6=pullback, 7=below, 8=entry */
assert.equal(
event?.bar,
8
);
assert.equal(
event?.price,
110
);

}
);

test(
"TEMP pullback-before-arm: short waits for bounce then enters",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4,
200
),
c(
6,
200,
201,
190,
195
),
/* bounce toward pt3 first — no pierce of pt4 (low stays above 190) */
c(
7,
195,
197,
191,
196
),
/* entry: first pierce of pt4 after arm */
c(
8,
196,
197,
188,
189
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"short",
b4,
p3:
200,
p4:
190
},
{
timeoutBars:
10,
pullbackBeforeArm:
true,
pullbackBeforeArmPct:
50
}
);

assert.equal(
event?.type,
"entry"
);
assert.equal(
event?.bar,
7
);
assert.equal(
event?.price,
190
);

}
);

test(
"TEMP pullback-before-arm: short cancels if pt4 pierced before bounce",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4,
200
),
c(
6,
200,
201,
190,
195
),
/* pierce pt4 before pullback */
c(
7,
195,
194,
185,
186
),
/* later bounce must not reopen entry */
c(
8,
186,
197,
185,
196
),
c(
9,
196,
197,
188,
189
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"short",
b4,
p3:
200,
p4:
190
},
{
timeoutBars:
10,
pullbackBeforeArm:
true,
pullbackBeforeArmPct:
50
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"pt4_before_pullback"
);

}
);

test(
"maxPt1Pt4Bars: stretched setup returns cancel (not null)",
()=>{

const b4 =
5;
const rows =
[
...padBefore(
b4
),
c(
6,
100,
110,
99,
105
),
c(
7,
105,
108,
100,
102
),
c(
8,
102,
107,
101,
104
)
];

const event =
resolvePatternSetupEvent(
rows,
{
side:
"long",
b1:
0,
b4,
p3:
100,
p4:
110
},
{
timeoutBars:
10,
maxPt1Pt4Bars:
3
}
);

assert.equal(
event?.type,
"cancel"
);
assert.equal(
event?.reason,
"max_pt1_pt4"
);

}
);
