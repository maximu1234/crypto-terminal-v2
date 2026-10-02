/**
 * Заглушка для страниц, недоступных при активной Мосбирже (read-only).
 */
import {
getActiveExchangeId
} from "./context.js?v=1";

export function isMoexReadOnlyActive(){

return getActiveExchangeId() ===
"moex";

}

/**
 * @param {{ title?: string, host?: HTMLElement|null, message?: string }} [opts]
 * @returns {boolean} true если показана заглушка (дальше boot страницы не нужен)
 */
export function mountMoexUnavailableStub(
opts = {}
){

if(
!isMoexReadOnlyActive()
){
return false;
}

const title =
String(
opts.title ||
"Раздел"
);
const message =
String(
opts.message ||
"Недоступно на Мосбирже (только просмотр графиков и рисунков на Скринере и в Терминале)."
);
const host =
opts.host ||
document.querySelector(
"main"
) ||
document.body;

if(
!host
){
return true;
}

host.innerHTML =
`
<div class="moex-readonly-stub" role="status" style="
  max-width:420px;margin:64px auto;padding:24px 20px;
  color:#e8eaed;font-family:system-ui,-apple-system,sans-serif;
  text-align:center;line-height:1.45;
">
  <p style="margin:0 0 8px;font-size:18px;font-weight:600">${title}</p>
  <p style="margin:0 0 20px;opacity:.78;font-size:14px">${message}</p>
  <p style="margin:0">
    <a href="/screener.html" style="color:#7dd3fc;text-decoration:none">Открыть Скринер</a>
    <span style="opacity:.4;margin:0 8px">·</span>
    <a href="/terminal.html" style="color:#7dd3fc;text-decoration:none">Терминал</a>
  </p>
</div>
`;

return true;

}
