/**
 * TradingView-style drawing color grid: 10 columns × 8 rows.
 * Row 0 = grayscale; rows 1–7 = hue families (light → saturated → dark).
 */
export const TV_COLOR_GRID = Object.freeze([
[
"#FFFFFF",
"#D1D4DC",
"#B2B5BE",
"#9598A1",
"#787B86",
"#5D606B",
"#434651",
"#2A2E39",
"#1E222D",
"#000000"
],
[
"#FFEBEE",
"#FFF3E0",
"#FFF8E1",
"#E8F5E9",
"#E0F2F1",
"#E1F5FE",
"#E3F2FD",
"#EDE7F6",
"#F3E5F5",
"#FCE4EC"
],
[
"#FFCDD2",
"#FFE0B2",
"#FFF9C4",
"#C8E6C9",
"#B2DFDB",
"#B3E5FC",
"#BBDEFB",
"#D1C4E9",
"#E1BEE7",
"#F8BBD9"
],
[
"#EF9A9A",
"#FFCC80",
"#FFF59D",
"#A5D6A7",
"#80CBC4",
"#81D4FA",
"#90CAF9",
"#B39DDB",
"#CE93D8",
"#F48FB1"
],
[
"#E57373",
"#FFB74D",
"#FFF176",
"#81C784",
"#4DB6AC",
"#4FC3F7",
"#64B5F6",
"#9575CD",
"#BA68C8",
"#F06292"
],
[
"#EF5350",
"#FFA726",
"#FFEB3B",
"#66BB6A",
"#26A69A",
"#29B6F6",
"#42A5F5",
"#7E57C2",
"#AB47BC",
"#EC407A"
],
[
"#E53935",
"#FB8C00",
"#FDD835",
"#43A047",
"#00897B",
"#039BE5",
"#1E88E5",
"#5E35B1",
"#8E24AA",
"#D81B60"
],
[
"#C62828",
"#EF6C00",
"#F9A825",
"#2E7D32",
"#00695C",
"#0277BD",
"#1565C0",
"#4527A0",
"#6A1B9A",
"#AD1457"
]
]);

export const TV_COLOR_PALETTE =
TV_COLOR_GRID.flat();

export function mountTvColorGrid(
container,
{
onSelect,
activeColor = null
} = {}
){

if(!container){
return;
}

container.innerHTML = "";
container.classList.add("tv-color-grid");

TV_COLOR_GRID.forEach(row=>{

row.forEach(hex=>{

const btn =
document.createElement("button");

btn.type = "button";
btn.className = "tv-color-swatch";
btn.dataset.color = hex;
btn.style.background = hex;
btn.title = hex;

if(
activeColor &&
hex.toLowerCase() ===
activeColor.toLowerCase()
){
btn.classList.add("active");
}

btn.addEventListener("click", e=>{

e.stopPropagation();
onSelect?.(hex);

});

container.appendChild(btn);

});

});

}
