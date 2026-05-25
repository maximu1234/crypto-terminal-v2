/** Не слать два Telegram за один алерт (браузер + worker). */

const recent =
new Map();

const DEDUP_MS =
90_000;

function dedupKey(
userId,
symbol,
shapeId
) {

return (
String(userId) +
"::" +
String(symbol || "").toUpperCase() +
"::" +
String(shapeId || "")
);

}

export function isTelegramAlertDeduped(
userId,
symbol,
shapeId
) {

const key =
dedupKey(
userId,
symbol,
shapeId
);

const at =
recent.get(key);

return (
at != null &&
Date.now() - at < DEDUP_MS
);

}

export function markTelegramAlertSent(
userId,
symbol,
shapeId
) {

const key =
dedupKey(
userId,
symbol,
shapeId
);

recent.set(
key,
Date.now()
);

if(recent.size > 500){
const cutoff =
Date.now() - DEDUP_MS;

for(const [k, t] of recent){
if(t < cutoff){
recent.delete(k);
}
}

}

}

/** @deprecated use isTelegramAlertDeduped — не помечает отправленным до успеха */
export function shouldSendTelegramAlert(
userId,
symbol,
shapeId
) {

return !isTelegramAlertDeduped(
userId,
symbol,
shapeId
);

}
