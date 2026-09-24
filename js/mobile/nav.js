/**
 * Top page tabs for phone pages only — not wired into desktop header.
 * Mounts into `.mobile-topbar` next to the logo (replaces the single H1 title).
 */
export function mountMobileNav(active) {
  document.getElementById("mobile-bottom-nav")?.remove();
  document.body.classList.add("mobile-shell");
  document.body.classList.remove("mobile-shell--bottom-nav");

  const topbar = document.querySelector(".mobile-topbar");
  if (!topbar) {
    return;
  }

  topbar.querySelector("#mobile-top-nav")?.remove();
  topbar.querySelector(".mobile-topbar-title")?.remove();

  const nav = document.createElement("nav");
  nav.id = "mobile-top-nav";
  nav.className = "mobile-top-nav";
  nav.setAttribute("aria-label", "Мобильная навигация");

  const items = [
    { id: "screener", href: "/m-screener.html", label: "Скринер" },
    { id: "terminal", href: "/m-terminal.html", label: "Терминал" }
  ];

  for (const item of items) {
    const a = document.createElement("a");
    a.href = item.href;
    a.className = "mobile-top-nav-link";
    if (item.id === active) {
      a.classList.add("is-active");
      a.setAttribute("aria-current", "page");
    }
    a.textContent = item.label;
    nav.append(a);
  }

  topbar.append(nav);
}
