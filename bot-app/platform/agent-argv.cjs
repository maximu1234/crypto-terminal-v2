/**
 * Shared CLI flag for tray-agent boot (no BrowserWindow).
 * Used by macOS LaunchAgent and Windows LoginItemSettings.
 */

const AGENT_FLAG =
"--agent";

function hasAgentArg(
argv = process.argv
){

return (
Array.isArray(
argv
) &&
argv.includes(
AGENT_FLAG
)
);

}

module.exports =
{
AGENT_FLAG,
hasAgentArg
};
