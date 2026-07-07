let handler = null;

export function setWorkerReloadRequestHandler(fn) {

  handler =
    typeof fn === "function"
      ? fn
      : null;

}

export function requestWorkerReload(reason = "manual") {

  if (!handler) {
    return false;
  }

  void Promise.resolve()
    .then(() => handler(reason))
    .catch(err => {
      console.warn(
        "worker reload request:",
        err?.message || err
      );
    });

  return true;

}
