export function didCrossLine(prev, curr, level) {

  if (
    !Number.isFinite(prev) ||
    !Number.isFinite(curr) ||
    !Number.isFinite(level)
  ) {
    return false;
  }

  if (prev === curr) {
    return false;
  }

  return (prev - level) * (curr - level) <= 0;

}

/** Свеча целиком (включая тень) — как на графике */
export function didCrossWithCandle(
prev,
candle,
level,
{
sameBar = false
} = {}
) {

  if (
    !Number.isFinite(prev) ||
    !Number.isFinite(level) ||
    !candle
  ) {
    return false;
  }

  const close = Number(candle.close);

  if (didCrossLine(prev, close, level)) {
    return true;
  }

  if (sameBar) {
    return false;
  }

  const high = Number(candle.high);
  const low = Number(candle.low);

  if (
    Number.isFinite(high) &&
    prev < level &&
    high >= level
  ) {
    return true;
  }

  if (
    Number.isFinite(low) &&
    prev > level &&
    low <= level
  ) {
    return true;
  }

  return false;

}
