export function tfToBingxInterval(
tf
){

const map =
{
"1":
"1m",
"3":
"3m",
"5":
"5m",
"15":
"15m",
"30":
"30m",
"60":
"1h",
"120":
"2h",
"240":
"4h",
"360":
"6h",
"720":
"12h",
"D":
"1d",
"W":
"1w",
"M":
"1M"
};

return map[
String(
tf
)
] ||
"1h";

}

const INTERVAL_TO_TF =
Object.freeze(
Object.fromEntries(
Object.entries(
{
"1":
"1m",
"3":
"3m",
"5":
"5m",
"15":
"15m",
"30":
"30m",
"60":
"1h",
"120":
"2h",
"240":
"4h",
"360":
"6h",
"720":
"12h",
"D":
"1d",
"W":
"1w",
"M":
"1M"
}
).map(
([
tf,
interval
])=>[
interval,
tf
]
)
)
);

export function bingxIntervalToTf(
interval
){

return INTERVAL_TO_TF[
String(
interval ||
""
)
] ||
"60";

}
