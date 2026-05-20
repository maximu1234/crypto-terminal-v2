import { getAlertToggleButtonHtml } from "./draw-ui-shared.js";

export function getWidgetToolbarHtml(){

return `

<div class="widget-draw-toolbar draw-toolbar-inline">

<button type="button" class="draw-btn draw-btn-sm" data-draw-tool="cursor" title="Курсор">
<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 3l12 8-5.5.5L11 21l-2.5-1.5L8.5 12 3 11z"/></svg>
</button>

<button type="button" class="draw-btn draw-btn-sm" data-draw-tool="trendline" title="Trendline">
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="5" y1="18" x2="19" y2="6" stroke="currentColor" stroke-width="1.5"/>
<circle cx="5" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
<circle cx="19" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
</svg>
</button>

<button type="button" class="draw-btn draw-btn-sm" data-draw-tool="hray" title="Horizontal Ray">
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="6" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.5"/>
<circle cx="6" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
</svg>
</button>

<button type="button" class="draw-btn draw-btn-sm" data-draw-tool="fib" title="Fib">
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="1.5"/>
<line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" stroke-width="1.5"/>
<line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" stroke-width="1.5"/>
<line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="1.5"/>
</svg>
</button>

<button type="button" class="draw-btn draw-btn-sm" data-draw-tool="channel" title="Channel">
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="5" y1="16" x2="19" y2="8" stroke="currentColor" stroke-width="1.5"/>
<line x1="5" y1="20" x2="19" y2="12" stroke="currentColor" stroke-width="1.5"/>
</svg>
</button>

<button type="button" class="draw-btn draw-btn-sm draw-tool-clear-all" title="Удалить все">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M9 3h6l1 2h4v2H4V5h4l1-2z" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M7 9v11h10V9" fill="none" stroke="currentColor" stroke-width="1.5"/>
</svg>
</button>

</div>

`;

}

export function getWidgetChartUiHtml(){

return `

<div class="draw-style-float hidden">

<button type="button" class="float-drag draw-style-drag" title="Перетащить">
<span class="drag-dots"></span>
</button>

<button type="button" class="float-color-btn draw-color-btn" title="Цвет">
<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true">
<path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 20l4-1 9-9-3-3-9 9-1 4zM14 6l3 3"/>
</svg>
<span class="color-stripe draw-color-stripe"></span>
</button>

<button type="button" class="float-width-btn draw-width-btn" title="Толщина">
<span class="width-line-preview draw-width-preview"></span>
<span class="draw-width-label">1px</span>
</button>

${getAlertToggleButtonHtml()}

<button type="button" class="float-settings draw-settings-btn" title="Настройки">
<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>
</button>

<button type="button" class="float-delete draw-delete-one-btn" title="Удалить">
<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M9 3h6l1 2h4v2H4V5h4l1-2zM7 9v11h10V9"/></svg>
</button>

</div>

<div class="draw-popover draw-color-popover hidden"></div>

<div class="draw-popover draw-width-popover hidden">
<button type="button" class="width-option active" data-width="1"><span class="width-sample" style="height:1px"></span><span>1</span></button>
<button type="button" class="width-option" data-width="2"><span class="width-sample" style="height:2px"></span><span>2</span></button>
<button type="button" class="width-option" data-width="3"><span class="width-sample" style="height:3px"></span><span>3</span></button>
<button type="button" class="width-option" data-width="4"><span class="width-sample" style="height:4px"></span><span>4</span></button>
</div>

<div class="draw-popover draw-settings-popover draw-settings-popover--fib hidden">
</div>

`;

}
