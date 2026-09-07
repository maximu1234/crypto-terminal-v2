import test from "node:test";
import assert from "node:assert/strict";

import {
CHANNEL_DEFAULT_COLOR,
DEFAULT_CHANNEL_LEVEL_SPEC,
channelLevelSegment,
cloneDefaultChannelRows,
createChannelToolDefaults,
ensureChannelLevelsVisible,
isChannelMidlineRatio,
migrateChannelToolDefaults
} from "../js/drawings/channel-spec.js";

import {
channelSettingsHtml
} from "../js/drawings/draw-channel-settings.js";

test("default channel levels: only 0, 0.5 and 1 are on", ()=>{

const rows =
cloneDefaultChannelRows();

assert.equal(
rows.length,
DEFAULT_CHANNEL_LEVEL_SPEC.length
);

const on =
rows.filter(
row=>
row.enabled
).map(
row=>
row.v
);

assert.deepEqual(
on,
[
0,
0.5,
1
]
);

assert.equal(
rows.some(
row=>
row.color
),
false
);

});

test("createChannelToolDefaults uses orange and inherited level colors", ()=>{

const defaults =
createChannelToolDefaults();

assert.equal(
defaults.color,
CHANNEL_DEFAULT_COLOR
);
assert.equal(
defaults.channelLevels.filter(
row=>
row.enabled
).length,
3
);

});

test("ensureChannelLevelsVisible restores defaults when every row is off", ()=>{

const empty =
cloneDefaultChannelRows().map(
row=>({
...row,
enabled: false
})
);

const next =
ensureChannelLevelsVisible(
empty
);
const on =
next.filter(
row=>
row.enabled
).map(
row=>
row.v
);

assert.deepEqual(
on,
[
0,
0.5,
1
]
);

});

test("migrateChannelToolDefaults keeps a saved color and adds levels", ()=>{

const migrated =
migrateChannelToolDefaults({
color:
"#3b82f6",
lineWidth:
2
});

assert.equal(
migrated.color,
"#3b82f6"
);
assert.equal(
migrated.lineWidth,
2
);
assert.deepEqual(
migrated.channelLevels.filter(
row=>
row.enabled
).map(
row=>
row.v
),
[
0,
0.5,
1
]
);

});

test("channelLevelSegment: 0 / 0.5 / 1 match rails and median", ()=>{

const geom = {
p1: { x: 0, y: 0 },
p2: { x: 100, y: 0 },
p3: { x: 0, y: 40 },
p4: { x: 100, y: 40 }
};

const rail0 =
channelLevelSegment(
geom,
0
);
const mid =
channelLevelSegment(
geom,
0.5
);
const rail1 =
channelLevelSegment(
geom,
1
);
const ext =
channelLevelSegment(
geom,
2
);

assert.deepEqual(
rail0,
{
start: { x: 0, y: 0 },
end: { x: 100, y: 0 }
}
);
assert.deepEqual(
mid,
{
start: { x: 0, y: 20 },
end: { x: 100, y: 20 }
}
);
assert.deepEqual(
rail1,
{
start: { x: 0, y: 40 },
end: { x: 100, y: 40 }
}
);
assert.deepEqual(
ext,
{
start: { x: 0, y: 80 },
end: { x: 100, y: 80 }
}
);
assert.equal(
isChannelMidlineRatio(
0.5
),
true
);
assert.equal(
isChannelMidlineRatio(
0.618
),
false
);

});

test("channelSettingsHtml has the levels grid", ()=>{

const html =
channelSettingsHtml();

assert.match(
html,
/class="channel-settings"/
);
assert.match(
html,
/id="channel-level-rows-root"/
);

});
