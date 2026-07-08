import {
WEB_HEADER_NAV_ITEMS
} from "./site-header-nav-web.js?v=1";

const DESKTOP_EXTRA_ITEMS =
[
{
href: "/script.html",
label: "Скрипт",
match: /^\/script(?:\.html)?\/?$/i
},
{
href: "/diary/",
label: "Дневник",
match: /^\/diary(?:\/|$)/i
}
];

export const DESKTOP_HEADER_NAV_ITEMS =
[
...WEB_HEADER_NAV_ITEMS,
...DESKTOP_EXTRA_ITEMS
];
