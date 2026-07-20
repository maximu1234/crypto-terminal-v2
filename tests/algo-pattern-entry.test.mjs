import test from "node:test";
import assert from "node:assert/strict";

import {
resolvePatternSetupEvent,
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
