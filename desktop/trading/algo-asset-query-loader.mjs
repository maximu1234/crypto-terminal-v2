/**
 * Node/Electron loader: algo renderer modules import siblings as `file.js?v=hash`.
 * Strip the query so the main process can import the same sources.
 */
export async function resolve(specifier, context, nextResolve) {
  const q = specifier.indexOf("?");
  const clean = q === -1 ? specifier : specifier.slice(0, q);
  return nextResolve(clean, context);
}
