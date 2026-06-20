/**
 * Текущая git-метка → подпись v0.N на Главной (index.html).
 * При каждой новой metka-N обновить METKA_NUMBER.
 */
export const METKA_NUMBER =
27;

export const RELEASE_VERSION_LABEL =
`v0.${METKA_NUMBER}`;

export function mountReleaseMarker(
root = document
){

root.querySelectorAll(
"[data-release-marker]"
).forEach(
el=>{
el.textContent =
RELEASE_VERSION_LABEL;
}
);

}
