/**
 * System toggles «Включить Скрипт / АлгоТрейдинг»:
 * фон гасим всегда; живую работу останавливаем только если она сейчас идёт.
 */

export function isAlgoBotWorking(
status
){

return !!(
status &&
status.running
);

}

export function isScriptScanWorking(
state =
{}
){

return !!(
state.scannerRunning ||
state.jobActive
);

}
