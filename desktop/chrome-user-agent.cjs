/**
 * UA без Electron — ближе к Chrome, некоторые CDN отдают оптимальнее.
 */
function chromeLikeUserAgent(
raw
){

const stripped =
String(
raw ||
""
)
.replace(
/\s*Electron\/[^\s]+/gi,
""
)
.replace(
/\s*multichart-desktop\/[^\s]+/gi,
""
)
.trim();

if(
/Chrome\/\d+/i.test(
stripped
)
){
return stripped;
}

return `${stripped} Chrome/131.0.6778.109 Safari/537.36`.trim();

}

module.exports =
{
chromeLikeUserAgent
};
