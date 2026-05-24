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
