// The MCP definition `src/worker/mcp.ts` would default-export for the oauth
// fixture worker: three of its probes.
import { defineMcp } from "@fcalell/plugin-api/mcp";
import type { routes } from "./worker-mcp.ts";

export default defineMcp<typeof routes>({
	instructions: "Probes of the oauth fixture.",
	tools: {
		"probe.caller": "Who the agent runs as.",
		"probe.organization": "The role in the grant's organization.",
		"probe.rename": "Needs organization update.",
	},
});
