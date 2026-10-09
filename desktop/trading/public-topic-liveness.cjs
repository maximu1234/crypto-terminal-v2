"use strict";

/**
 * Когда сокет жив, а часть тем замолчала — переподписать только их.
 * Если замолчали все, сокет поднимается заново.
 * Без electron: этот файл грузят и тесты CI.
 */
function planPublicTopicLiveness(
state
){

const now =
Number(
state?.now
) ||
0;
const topics =
Array.isArray(
state?.topics
)
? state.topics
: [];
const lastAt =
state?.lastAt ||
{};
const subscribedAt =
state?.subscribedAt ||
{};
const klineSilenceMs =
Number(
state?.klineSilenceMs
) ||
45000;
const tickerSilenceMs =
Number(
state?.tickerSilenceMs
) ||
60000;
const resubscribe =
[];
let fresh =
0;

for(
const topic of topics
){

const stamp =
Math.max(
Number(
lastAt[
topic
]
) ||
0,
Number(
subscribedAt[
topic
]
) ||
0
);

if(
!stamp
){
continue;
}

const limit =
String(
topic
).startsWith(
"kline."
)
? klineSilenceMs
: tickerSilenceMs;

if(
now -
stamp >=
limit
){
resubscribe.push(
topic
);
}else{
fresh +=
1;
}

}

if(
!resubscribe.length
){
return {
resubscribe: [],
reconnect: false
};
}

if(
fresh ===
0
){
return {
resubscribe: [],
reconnect: true
};
}

return {
resubscribe,
reconnect: false
};

}

module.exports =
{
planPublicTopicLiveness
};
