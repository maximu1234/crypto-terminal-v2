/**
 * Нормализует ALERT_WORKER_URL: всегда абсолютный origin с https://
 * (без https браузер ходит на vercel.app/crypto-terminal-v2-production… → 404).
 */
export function normalizeAlertWorkerBaseUrl(raw) {

let s =
String(raw || "").trim();

if(!s){
return "";
}

s =
s.replace(
/\/+$/,
""
);

s =
s.replace(
/\/alerts\/?$/i,
""
);

if(
!/^https?:\/\//i.test(
s
)
){
s =
`https://${s.replace(/^\/+/, "")}`;
}

try{

const u =
new URL(s);

if(
u.protocol !== "http:" &&
u.protocol !== "https:"
){
return "";
}

return u.origin;

}catch{

return "";

}

}
