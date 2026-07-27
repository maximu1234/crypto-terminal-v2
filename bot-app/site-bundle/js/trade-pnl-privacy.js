/** Скрытие PnL/объёмов (глазик в панели Позиции) — общий флаг localStorage. */
export const TOTAL_PNL_HIDDEN_KEY =
"trade_book_total_pnl_hidden_v1";

export function isTradePnlHidden(){

try{
return localStorage.getItem(
TOTAL_PNL_HIDDEN_KEY
) ===
"1";
}catch{
return false;
}

}

export function maskTradeDisplay(
value
){

return isTradePnlHidden()
? "***"
: value;

}
