/**
 * Screener widget lifecycle — skip chart ops after destroy / page change.
 */
export function isScreenerWidgetCurrent(
widget,
renderToken,
activeWidgets
){

return !!(
widget &&
!widget.disposed &&
widget.loadId ===
renderToken &&
Array.isArray(
activeWidgets
) &&
activeWidgets.includes(
widget
)
);

}
