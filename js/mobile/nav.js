/**
 * Bottom nav for phone pages only — not wired into desktop header.
 */
export function mountMobileNav(active) {
  const existing = document.getElementById("mobile-bottom-nav");
  if (existing) {
    existing.remove();
  }

  const nav = document.createElement("nav");
  nav.id = "mobile-bottom-nav";
  nav.className = "mobile-bottom-nav";
  nav.setAttribute("aria-label", "Мобильная навигация");

  const items = [
    { id: "screener", href: "/m-screener.html", label: "Скринер" },
    { id: "terminal", href: "/m-terminal.html", label: "Терминал" }
  ];

  for (const item of items) {
    const a = document.createElement("a");
    a.href = item.href;
    a.className = "mobile-bottom-nav-link";
    if (item.id === active) {
      a.classList.add("is-active");
      a.setAttribute("aria-current", "page");
    }
    a.textContent = item.label;
    nav.append(a);
  }

  document.body.append(nav);
  document.body.classList.add("mobile-shell");
}
