/**
 * Screener page buttons. The page itself owns the current page and the reload.
 */
export function renderScreenerPagination({
paginationEl,
currentPage,
totalPages,
selectPage
}){

paginationEl.innerHTML =
"";

const prev =
document.createElement(
"button"
);

prev.className =
"page-btn page-nav-prev";
prev.setAttribute(
"aria-label",
"Предыдущая страница"
);
prev.textContent =
"‹";
prev.disabled =
currentPage <=
1;
prev.onclick =
()=>{
selectPage(
currentPage -
1
);
};

paginationEl.appendChild(
prev
);

const pagesWrap =
document.createElement(
"div"
);

pagesWrap.className =
"pagination-pages";
pagesWrap.setAttribute(
"aria-label",
"Номера страниц"
);

paginationEl.appendChild(
pagesWrap
);

const maxButtons =
11;
const half =
Math.floor(
maxButtons /
2
);
let start =
Math.max(
1,
currentPage -
half
);
let end =
Math.min(
totalPages,
start +
maxButtons -
1
);

start =
Math.max(
1,
end -
maxButtons +
1
);

if(
start >
1
){

addPageButton(
1
);

if(
start >
2
){
addEllipsis();
}

}

for(
let page =
start;
page <=
end;
page++
){
addPageButton(
page
);
}

if(
end <
totalPages
){

if(
end <
totalPages -
1
){
addEllipsis();
}

addPageButton(
totalPages
);

}

const next =
document.createElement(
"button"
);

next.className =
"page-btn page-nav-next";
next.setAttribute(
"aria-label",
"Следующая страница"
);
next.textContent =
"›";
next.disabled =
currentPage >=
totalPages;
next.onclick =
()=>{
selectPage(
currentPage +
1
);
};

paginationEl.appendChild(
next
);

function addPageButton(
page
){

const btn =
document.createElement(
"button"
);

btn.className =
`page-btn${page === currentPage ? " active" : ""}`;
btn.textContent =
String(
page
);
btn.onclick =
()=>{
selectPage(
page
);
};

pagesWrap.appendChild(
btn
);

}

function addEllipsis(){

const span =
document.createElement(
"span"
);

span.className =
"page-ellipsis";
span.textContent =
"…";
pagesWrap.appendChild(
span
);

}

}
