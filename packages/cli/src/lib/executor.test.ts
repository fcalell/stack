import { describe, expect, it } from "vitest";
import { sortStepsByPhase } from "#lib/executor";

describe("sortStepsByPhase", () => {
	it("sorts pre -> main -> post stably", () => {
		const steps = [
			{ name: "b", phase: "main" as const },
			{ name: "c", phase: "post" as const },
			{ name: "a", phase: "pre" as const },
			{ name: "d", phase: "main" as const },
		];
		const result = sortStepsByPhase(steps);
		expect(result.map((s) => s.name)).toEqual(["a", "b", "d", "c"]);
	});

	it("returns a copy (does not mutate input)", () => {
		const steps = [
			{ name: "x", phase: "post" as const },
			{ name: "y", phase: "pre" as const },
		];
		sortStepsByPhase(steps);
		expect(steps.map((s) => s.name)).toEqual(["x", "y"]);
	});
});
