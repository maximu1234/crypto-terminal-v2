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

/** Длительность бара в секундах (как chart-ruler). */
export function tfBarDurationSec(tf) {

  const norm =
    normalizeWorkerTf(tf);

  const map = {
    "1": 60,
    "5": 300,
    "15": 900,
    "60": 3600,
    "240": 14400,
    "D": 86400,
    "W": 604800
  };

  return map[norm] || 3600;

}

/**
 * Алерт создан на этой свече (не учитывать исторические тени бара).
 * createdAt — ms, ISO string или unix sec.
 */
export function alertCreatedOnBar(
createdAt,
barTimeSec,
tf
) {

  if (
    barTimeSec ==
    null
  ) {
    return false;
  }

  let createdSec =
    0;

  if (
    typeof createdAt ===
    "number" &&
    Number.isFinite(
      createdAt
    )
  ) {
    createdSec =
      createdAt >
      1e12
        ? Math.floor(
          createdAt /
          1000
        )
        : Math.floor(
          createdAt
        );
  } else if (
    createdAt
  ) {
    createdSec =
      Math.floor(
        new Date(
          createdAt
        ).getTime() /
        1000
      );
  }

  if (
    !createdSec
  ) {
    return false;
  }

  const duration =
    tfBarDurationSec(tf);

  return (
    createdSec >=
    barTimeSec &&
    createdSec <
    barTimeSec +
    duration
  );

}
