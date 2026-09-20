/**
 * Терминал: Super DX-Ball — кнопка над Чеклистом, левая половина экрана.
 */
import {
  startDxBall,
  stopDxBall
} from "../dx-ball/main.js?v=5";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&display=swap";

const DXBALL_ICON_SVG =
  `<svg class="terminal-dxball-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
<rect x="3" y="4" width="18" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="5" y="10" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.9"/>
<rect x="10" y="10" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.55"/>
<rect x="15" y="10" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.9"/>
<circle cx="12" cy="17.5" r="1.6" fill="currentColor"/>
</svg>`;

let open = false;
let mounted = false;
let btnEl = null;
let hostEl = null;
let canvasEl = null;
let paneEl = null;
let session = null;
let fontsLink = null;
let resizeObserver = null;

function ensureFonts() {
  if (fontsLink || document.querySelector(`link[data-dxball-fonts]`)) {
    return;
  }
  fontsLink = document.createElement("link");
  fontsLink.rel = "stylesheet";
  fontsLink.href = FONT_HREF;
  fontsLink.setAttribute("data-dxball-fonts", "1");
  document.head.appendChild(fontsLink);
}

function ensureHost() {
  if (hostEl) {
    return hostEl;
  }

  hostEl = document.createElement("div");
  hostEl.id = "terminal-dxball-host";
  hostEl.className = "terminal-dxball-host";
  hostEl.hidden = true;
  hostEl.setAttribute("aria-label", "DX-Ball");

  const app = document.createElement("div");
  app.className = "terminal-dxball-app";

  canvasEl = document.createElement("canvas");
  canvasEl.id = "terminal-dxball-canvas";
  canvasEl.className = "terminal-dxball-canvas";
  canvasEl.width = 800;
  canvasEl.height = 600;
  canvasEl.setAttribute("tabindex", "0");

  app.appendChild(canvasEl);
  hostEl.appendChild(app);

  const toolbar = document.getElementById("draw-toolbar");
  const panes = document.getElementById("charts-stack-panes");
  const chartPane = paneEl || toolbar?.closest(".coins-chart-pane");

  if (chartPane && panes && toolbar) {
    chartPane.insertBefore(hostEl, panes);
  } else if (chartPane) {
    chartPane.appendChild(hostEl);
  } else {
    document.body.appendChild(hostEl);
  }

  return hostEl;
}

function bindHostResize() {
  if (!hostEl || resizeObserver) {
    return;
  }
  resizeObserver = new ResizeObserver(() => {
    if (!open) {
      return;
    }
    session?.resize?.();
  });
  resizeObserver.observe(hostEl);
}

function setOpen(next) {
  open = !!next;
  ensureHost();
  ensureFonts();
  bindHostResize();

  document.body.classList.toggle("terminal-dxball-open", open);
  btnEl?.classList.toggle("active", open);
  btnEl?.setAttribute("aria-expanded", open ? "true" : "false");

  if (hostEl) {
    hostEl.hidden = !open;
  }

  if (open) {
    if (!session) {
      session = startDxBall(canvasEl);
    }
    requestAnimationFrame(() => {
      session?.resize?.();
      try {
        canvasEl?.focus?.({ preventScroll: true });
      } catch {
        canvasEl?.focus?.();
      }
      window.dispatchEvent(new Event("resize"));
    });
    return;
  }

  if (session) {
    session.pause();
    session.stop();
    session = null;
  } else {
    stopDxBall();
  }

  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function onToggle(event) {
  event.preventDefault();
  event.stopPropagation();
  setOpen(!open);
}

export function mountTerminalDxBall() {
  if (mounted) {
    return;
  }

  const toolbar = document.getElementById("draw-toolbar");
  paneEl = toolbar?.closest(".coins-chart-pane");

  if (!toolbar || !paneEl) {
    return;
  }

  mounted = true;

  btnEl = document.createElement("button");
  btnEl.type = "button";
  btnEl.className = "draw-btn terminal-dxball-btn";
  btnEl.title = "DX-Ball";
  btnEl.setAttribute("aria-label", "DX-Ball");
  btnEl.setAttribute("aria-expanded", "false");
  btnEl.setAttribute("aria-controls", "terminal-dxball-host");
  btnEl.innerHTML = DXBALL_ICON_SVG;
  btnEl.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  btnEl.addEventListener("click", onToggle);

  const checklistBtn = toolbar.querySelector(".terminal-checklist-btn");
  if (checklistBtn) {
    toolbar.insertBefore(btnEl, checklistBtn);
  } else {
    toolbar.append(btnEl);
  }

  ensureHost();
}

export function isTerminalDxBallOpen() {
  return open;
}
