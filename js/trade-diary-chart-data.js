import {
getActiveExchangeId
} from "./market-api.js?v=00f19708";

import {
getExchangeDefinition
} from "./exchanges/registry.js?v=c1f7bab0";

import {
getLoadedTradeExchangeModules,
loadTradeExchangeModules
} from "./trade/module-router.js?v=f9d37714";

export const DIARY_CHART_TFS =
Object.freeze([
"1",
"5",
"15",
"60",
"240",
"D",
"W"
]);

export const DEFAULT_DIARY_CHART_TF =
"15";

const TF_MINUTES =
Object.freeze({
"1":
1,
"5":
5,
"15":
15,
"60":
60,
"240":
240,
"D":
24 *
60,
"W":
7 *
24 *
60
});

const TF_LABELS =
Object.freeze({
"1":
"1m",
"5":
"5m",
"15":
"15m",
"60":
"1h",
"240":
"4h",
"D":
"1D",
"W":
"W"
});

/** Свечей слева от входа и справа от выхода (одинаково на всех ТФ). */
const DIARY_CHART_BARS_EACH_SIDE =
200;

export function diaryChartTfLabel(
tf
){

return TF_LABELS[
tf
] ||
tf;

}

export function linearSymbol(
symbol
){

const raw =
String(
symbol ||
""
).toUpperCase();

return raw.endsWith(
"USDT"
)
? raw
: `${raw}USDT`;

}

async function fetchKlineBatch(
symbol,
tf,
end
){

await loadTradeExchangeModules();

const fn =
getLoadedTradeExchangeModules()?.diaryFetchKlineBatch;

if(
typeof fn !==
"function"
){
return null;
}

return fn(
symbol,
tf,
end
);

}

export async function loadCandlesAroundTrade(
symbol,
tf,
openTimeMs,
closeTimeMs
){

const tfMin =
TF_MINUTES[
tf
] ||
15;
const tfMs =
tfMin *
60 *
1000;
const tradeSpanMs =
Math.max(
tfMs,
closeTimeMs -
openTimeMs
);
const sideBars =
DIARY_CHART_BARS_EACH_SIDE;
const startMs =
openTimeMs -
sideBars *
tfMs;
const endMs =
closeTimeMs +
sideBars *
tfMs;
const minWindowMs =
tradeSpanMs +
sideBars *
2 *
tfMs;
const centerMs =
openTimeMs +
tradeSpanMs /
2;
let windowStart =
Math.min(
startMs,
centerMs -
minWindowMs /
2
);
let windowEnd =
Math.max(
endMs,
centerMs +
minWindowMs /
2
);
let end =
windowEnd;
const unique =
new Map();
let guard =
0;

while(
guard <
8
){

guard++;
const batch =
await fetchKlineBatch(
symbol,
tf,
end
);

if(
!batch?.length
){
break;
}

for(
const row of
batch
){

const time =
Math.floor(
Number(
row.timeMs
) /
1000
);

unique.set(
time,
{
time,
open:
Number(
row.open
),
high:
Number(
row.high
),
low:
Number(
row.low
),
close:
Number(
row.close
),
volume:
Number(
row.volume
) ||
0
}
);

}

const oldest =
Math.min(
...batch.map(
k=>
Number(
k.timeMs
)
)
);

if(
oldest <=
windowStart
){
break;
}

end =
oldest -
1;

}

return [
...unique.values()
]
.filter(
c=>
c.time *
1000 >=
windowStart &&
c.time *
1000 <=
windowEnd
)
.sort(
(
a,
b
)=>
a.time -
b.time
);

}

export function buildChartShell(
symbol
){

const shell =
document.createElement(
"div"
);
shell.className =
"trade-diary-detail-chart-shell";

const head =
document.createElement(
"div"
);
head.className =
"trade-diary-detail-chart-head";

const meta =
document.createElement(
"div"
);
meta.className =
"trade-diary-detail-chart-meta";
const exchangeId =
getActiveExchangeId() ||
"bybit";
const exchangeName =
getExchangeDefinition(
exchangeId
)?.name ||
exchangeId;
meta.textContent =
`LINEAR:${symbol} · ${exchangeName}`;

const tfBar =
document.createElement(
"div"
);
tfBar.className =
"trade-diary-tf-bar";

for(
const tf of
DIARY_CHART_TFS
){

const btn =
document.createElement(
"button"
);
btn.type =
"button";
btn.className =
"trade-diary-tf-btn";
btn.dataset.diaryTf =
tf;
btn.textContent =
diaryChartTfLabel(
tf
);
tfBar.append(
btn
);

}

head.append(
meta,
tfBar
);

const mount =
document.createElement(
"div"
);
mount.className =
"trade-diary-detail-chart-canvas";
mount.dataset.diaryCanvas =
"1";

shell.append(
head,
mount
);

return shell;

}

