/** Как в браузере: «1», не «1m». */
export function normalizeWorkerTf(tf) {

  if (
    tf == null ||
    tf === ""
  ) {
    return "60";
  }

  const s =
    String(tf).trim();

  const aliases = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1h": "60",
    "4h": "240",
    "1d": "D",
    "1w": "W"
  };

  return aliases[s.toLowerCase()] || s;

}
