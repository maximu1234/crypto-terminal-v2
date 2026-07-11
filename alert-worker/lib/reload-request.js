let handler = null;

export function setWorkerReloadRequestHandler(fn) {

  handler =
    typeof fn === "function"
      ? fn
      : null;

}

export function requestWorkerReload(
  reason = "manual",
  opts = {}
) {

  if (!handler) {
    return false;
  }

  void Promise.resolve()
    .then(() => handler(reason, opts))
    .catch(err => {
      console.warn(
        "worker reload request:",
        err?.message || err
      );
    });

  return true;

}
