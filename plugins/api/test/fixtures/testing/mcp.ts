// The MCP definition `src/worker/mcp.ts` would default-export, over the
// fixture routes. Its order is not alphabetical on purpose.
import { defineMcp } from "../../../src/mcp.ts";
import type * as routes from "./routes/index.ts";

export default defineMcp<typeof routes>({
	instructions: "Fixture tools.",
	tools: {
		"agent.note": "Saves a note.",
		"agent.whoami": "Says who runs.",
		"agent.due": "Reads dates.",
		"agent.list": "Lists two rows.",
		"agent.refuse": "Always refused.",
		"agent.boom": "Always throws.",
		"agent.big": "Answers a bigint.",
		"agent.bare": "A bare handler.",
	},
});
