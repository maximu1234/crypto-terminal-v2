import {
fetchBybit
} from "../../bybit-fetch.js?v=17";

export async function pingBybitPublicFromAdapter(){

const started =
performance.now();

try{

await fetchBybit(
"/v5/market/time",
{
timeoutMs:
8000,
retries:
0
}
);

return {
ok:
true,
publicMs:
Math.round(
performance.now() -
started
)
};

}catch(
err
){

return {
ok:
false,
message:
err?.message ||
"Нет связи с Bybit"
};

}

}
