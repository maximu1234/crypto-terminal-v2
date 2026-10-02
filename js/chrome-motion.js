/**
 * Soft open/close for chrome surfaces (settings, dropdowns, DOM ladder).
 * Uses opacity/transform only — does not touch chart resize path.
 * See docs/PERF_CHROME_CHART.md phase 2.
 */

export const CHROME_MOTION_MS =
180;

export function prefersReducedChromeMotion(){

try{
return !!window.matchMedia?.(
"(prefers-reduced-motion: reduce)"
)?.matches;
}catch{
return false;
}

}

/**
 * @param {HTMLElement|null|undefined} el
 * @param {{ shownClass?: string }} [opts]
 */
export function openChromeSurface(
el,
opts = {}
){

if(
!el
){
return;
}

const shownClass =
opts.shownClass ||
"chrome-surface--shown";

el.classList.add(
"chrome-surface"
);
el.classList.remove(
"hidden",
"chrome-surface--closing"
);

if(
prefersReducedChromeMotion()
){
el.classList.add(
shownClass
);
return;
}

el.classList.remove(
shownClass
);

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
el.classList.add(
shownClass
);
}
);
}
);

}

/**
 * @param {HTMLElement|null|undefined} el
 * @param {{ shownClass?: string, onDone?: ()=>void }} [opts]
 */
export function closeChromeSurface(
el,
opts = {}
){

const onDone =
opts.onDone;
const shownClass =
opts.shownClass ||
"chrome-surface--shown";

if(
!el
){
onDone?.();
return;
}

function finish(){

el.classList.add(
"hidden"
);
el.classList.remove(
"chrome-surface--closing",
shownClass
);
onDone?.();

}

if(
prefersReducedChromeMotion() ||
el.classList.contains(
"hidden"
)
){
finish();
return;
}

el.classList.add(
"chrome-surface--closing"
);
el.classList.remove(
shownClass
);

let settled =
false;

function settle(){

if(
settled
){
return;
}

settled =
true;
finish();

}

const onEnd =
(
e
)=>{

if(
e.target !==
el
){
return;
}

el.removeEventListener(
"transitionend",
onEnd
);
settle();

};

el.addEventListener(
"transitionend",
onEnd
);

setTimeout(
settle,
CHROME_MOTION_MS +
80
);

}
