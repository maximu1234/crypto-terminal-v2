export function calculateRSI(data, period=14){

if(data.length < period+1){
return [];
}

let gains = 0;
let losses = 0;

const result = [];

for(let i=1;i<=period;i++){

const diff =
data[i].close - data[i-1].close;

if(diff >= 0){
gains += diff;
}else{
losses += Math.abs(diff);
}

}

let avgGain = gains / period;
let avgLoss = losses / period;

for(let i=period;i<data.length;i++){

const diff =
data[i].close - data[i-1].close;

const gain =
diff > 0 ? diff : 0;

const loss =
diff < 0 ? Math.abs(diff) : 0;

avgGain =
((avgGain*(period-1))+gain)/period;

avgLoss =
((avgLoss*(period-1))+loss)/period;

const rs =
avgGain / (avgLoss || 1);

const rsi =
100 - (100/(1+rs));

result.push({

time:data[i].time,
value:rsi

});

}

return result;

}
