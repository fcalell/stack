import { test } from "node:test";
import { defineMcp } from "../src/mcp.ts";
import type * as routes from "./fixtures/testing/routes/index.ts";

// Checked by `check-types`: the lines below fail to compile when a path the
// definition may not list is accepted, or one it may list is refused.
test("defineMcp takes only procedure paths", () => {
	defineMcp<typeof routes>({
		instructions: "",
		tools: { "agent.note": "a router path", "inputs.greet": "another" },
	});

	defineMcp<typeof routes>({
		instructions: "",
		tools: {
			// @ts-expect-error a namespace is no procedure
			agent: "a namespace",
		},
	});

	defineMcp<typeof routes>({
		instructions: "",
		tools: {
			// @ts-expect-error no such procedure
			"agent.missing": "a missing path",
		},
	});

	defineMcp<typeof routes>({
		instructions: "",
		tools: {
			// @ts-expect-error a description is a string
			"agent.note": 1,
		},
	});
});
