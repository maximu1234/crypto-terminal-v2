/**
 * Node test helper: browser globals some renderer modules touch at import time.
 */
if (
  typeof globalThis.navigator === "undefined"
) {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      userAgent: "node-test",
      language: "en-US"
    },
    configurable: true
  });
}

if (
  typeof globalThis.window === "undefined"
) {
  globalThis.window = globalThis;
}

if (
  typeof globalThis.window.location === "undefined"
) {
  globalThis.window.location = {
    pathname: "/",
    search: "",
    href: "http://localhost/"
  };
}
