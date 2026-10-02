/**
 * Таймфреймы терминала → interval ISS.
 * Доступны: 1, 10, 60, 24, 7, 31 (иногда 4).
 */
export function tfToMoexInterval(
tf
){

const map =
{
"1":
1,
"3":
1,
"5":
1,
"15":
10,
"30":
10,
"60":
60,
"120":
60,
"240":
60,
"360":
60,
"720":
60,
D:
24,
W:
7,
M:
31
};

const key =
String(
tf ||
""
);

return map[
key
] ??
60;

}

/** Примерная длительность одной свечи ISS (мс) — для пагинации истории. */
export function moexIntervalMs(
interval
){

const n =
Number(
interval
);

if(
n ===
1
){
return 60 *
1000;
}

if(
n ===
10
){
return 10 *
60 *
1000;
}

if(
n ===
60
){
return 60 *
60 *
1000;
}

if(
n ===
4
){
return 4 *
60 *
60 *
1000;
}

if(
n ===
24
){
return 24 *
60 *
60 *
1000;
}

if(
n ===
7
){
return 7 *
24 *
60 *
60 *
1000;
}

if(
n ===
31
){
return 31 *
24 *
60 *
60 *
1000;
}

return 60 *
60 *
1000;

}
