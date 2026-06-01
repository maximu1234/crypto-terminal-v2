/**
 * Twelve Data через /api/twelvedata (ключ на Vercel / в env локального сервера).
 */

export async function fetchTwelveTimeSeries(
symbol,
interval,
outputsize = 2500
){

const params =
new URLSearchParams({
symbol,
interval,
outputsize: String(outputsize)
});

const res =
await fetch(
`/api/twelvedata?${params.toString()}`
);

const json =
await res.json().catch(()=>({}));

if(
!res.ok
){
const msg =
json?.message ||
json?.error ||
`Twelve Data HTTP ${res.status}`;
throw new Error(msg);
}

return json;

}
