/* Объём позиции — та же формула, что на странице Калькулятор:
   Сумма входа ($) = (R × 100) ÷ C, где R — риск в $, C — стоп в % */

export function parseMoneyInput(raw){

if(
raw == null ||
String(raw).trim() === ""
){
return null;
}

const n =
parseFloat(
String(raw).replace(",", ".")
);

if(
!Number.isFinite(n) ||
n <= 0
){
return null;
}

return n;

}

export function calcPositionVolumeUsd(
riskUsd,
stopLossPct
){

if(
!Number.isFinite(riskUsd) ||
riskUsd <= 0 ||
!Number.isFinite(stopLossPct) ||
stopLossPct <= 0
){
return null;
}

return Math.round(
(riskUsd * 100) /
stopLossPct
);

}

export function formatVolumeUsd(volume){

if(
volume == null ||
!Number.isFinite(volume)
){
return "—";
}

return Math.round(volume)
.toLocaleString("ru-RU");

}

export function formatMoneyUsd(amount){

if(
amount == null ||
!Number.isFinite(amount)
){
return "—";
}

const text =
amount.toLocaleString(
"ru-RU",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
);

return `${text}$`;

}

export function formatRiskRewardLabel(rrNum){

if(
!Number.isFinite(rrNum) ||
rrNum <= 0
){
return "—";
}

const rounded =
Math.round(rrNum * 10) / 10;

if(
Math.abs(rounded - Math.round(rounded)) <
0.05
){
return `1:${Math.round(rounded)}`;
}

return `1:${rounded.toFixed(1)}`;

}

export function calcPositionSizing(
riskUsd,
tpPct,
slPct
){

const risk =
parseMoneyInput(riskUsd);

if(
risk == null ||
!Number.isFinite(tpPct) ||
!Number.isFinite(slPct) ||
slPct <= 0
){
return null;
}

const volume =
calcPositionVolumeUsd(
risk,
slPct
);

if(
volume == null
){
return null;
}

const rrNum =
tpPct / slPct;
const profitUsd =
risk * rrNum;

return {
riskUsd: risk,
tpPct,
slPct,
volume,
profitUsd,
rrNum,
rrLabel: formatRiskRewardLabel(rrNum)
};

}
