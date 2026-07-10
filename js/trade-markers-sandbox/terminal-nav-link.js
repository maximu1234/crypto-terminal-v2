/**
 * Ссылка на песочницу маркеров — только desktop Терминал.
 */
const LINK_ID =
"trade-markers-sandbox-link";

const STYLE_ID =
"trade-markers-sandbox-link-style";

function ensureStyles(){

if(
document.getElementById(
STYLE_ID
)
){
return;
}

const style =
document.createElement(
"style"
);
style.id =
STYLE_ID;
style.textContent =
`
body.terminal-page #topbar.coins-topbar .trade-markers-sandbox-link{
display:inline-flex;
align-items:center;
height:28px;
padding:0 10px;
margin-left:4px;
border:1px solid #374151;
border-radius:6px;
font:500 12px/1 system-ui,-apple-system,sans-serif;
color:#a5b4fc;
text-decoration:none;
white-space:nowrap;
background:#111827;
}
body.terminal-page #topbar.coins-topbar .trade-markers-sandbox-link:hover{
background:#1f2937;
color:#c7d2fe;
border-color:#4b5563;
}
`;

document.head.appendChild(
style
);

}

function isTerminalDesktop(){

return (
!!window.cryptoTerminalDesktop?.isDesktop &&
document.body.classList.contains(
"terminal-page"
)
);

}

export function mountTradeMarkersSandboxLink(){

if(
!isTerminalDesktop()
){
return;
}

if(
document.getElementById(
LINK_ID
)
){
return;
}

const indicatorsWrap =
document.getElementById(
"chart-indicators-wrap"
);

if(
!indicatorsWrap
){
return;
}

ensureStyles();

const link =
document.createElement(
"a"
);
link.id =
LINK_ID;
link.href =
"/trade-markers-test.html";
link.className =
"trade-markers-sandbox-link";
link.title =
"Тест: маркеры сделок ETHUSDT.P";
link.textContent =
"Маркеры";

indicatorsWrap.insertAdjacentElement(
"afterend",
link
);

}
