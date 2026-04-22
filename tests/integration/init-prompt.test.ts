import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { buildTestGraph } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { vite } from "@fcalell/plugin-vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// A non-interactive prompt stub: select picks the first option, text returns
// the default, confirm returns false. Mirrors how `stack init --yes` wires
// its prompt context in production.
const nonInteractivePrompt = {
	text: async (_msg: string, opts?: { default?: string }): Promise<string> =>
		opts?.default ?? "",
	confirm: async (): Promise<boolean> => false,
	select: async <T>(
		_msg: string,
		opts: { label: string; value: T }[],
	): Promise<T> => {
		const first = opts[0];
		if (!first) throw new Error("select called with no options");
		return first.value;
	},
	multiselect: async <T>(): Promise<T[]> => [],
};

// Drive every prompt contribution through its `ask` handler just as `stack
// init` does: resolve cli.slots.initPrompts → for each PromptSpec, invoke
// `spec.ask(ctxWithPrompt, priors)`.
async function collectPromptAnswers(
	promptSpecs: Array<{
		plugin: string;
		ask: (
			ctx: unknown,
			priors: Record<string, unknown>,
		) => Promise<Record<string, unknown>>;
	}>,
): Promise<Record<string, Record<string, unknown>>> {
	const answers: Record<string, Record<string, unknown>> = {};
	for (const spec of promptSpecs) {
		const result = await spec.ask(
			{ prompt: nonInteractivePrompt },
			{ ...answers },
		);
		answers[spec.plugin] = result;
	}
	return answers;
}

describe("initPrompts slot across multi-plugin configs", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-init-prompt-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("accumulates db + auth answers keyed by plugin name in a full config", async () => {
		const { graph } = await buildTestGraph({
			config: defineConfig({
				app: { name: "app", domain: "app.example.com" },
				plugins: [
					cloudflare(),
					api(),
					db({ dialect: "d1", databaseId: "placeholder" }),
					auth(),
				],
			}),
			cwd,
		});

		const prompts = await graph.resolve(cliSlots.initPrompts);
		expect(prompts.length).toBeGreaterThan(0);

		const answers = await collectPromptAnswers(prompts);
		expect(Object.keys(answers).sort()).toEqual(["auth", "db"]);
		expect(answers.db).toMatchObject({ dialect: "d1" });
		expect(answers.auth).toMatchObject({ cookies: { prefix: "app" } });
	});

	it("db prompt contribution yields dialect + databaseId defaults", async () => {
		const { graph } = await buildTestGraph({
			config: defineConfig({
				app: { name: "app", domain: "example.com" },
				plugins: [
					cloudflare(),
					api(),
					db({ dialect: "d1", databaseId: "placeholder" }),
				],
			}),
			cwd,
		});

		const prompts = await graph.resolve(cliSlots.initPrompts);
		const dbPrompt = prompts.find((p) => p.plugin === "db");
		expect(dbPrompt).toBeDefined();
		if (!dbPrompt) return;

		const answers = await dbPrompt.ask({ prompt: nonInteractivePrompt }, {});
		expect(answers).toEqual({
			dialect: "d1",
			databaseId: "YOUR_D1_DATABASE_ID",
		});
	});

	it("auth prompt contribution yields cookies + organization defaults", async () => {
		const { graph } = await buildTestGraph({
			config: defineConfig({
				app: { name: "app", domain: "example.com" },
				plugins: [
					cloudflare(),
					api(),
					db({ dialect: "d1", databaseId: "x" }),
					auth(),
				],
			}),
			cwd,
		});

		const prompts = await graph.resolve(cliSlots.initPrompts);
		const authPrompt = prompts.find((p) => p.plugin === "auth");
		expect(authPrompt).toBeDefined();
		if (!authPrompt) return;

		const answers = await authPrompt.ask({ prompt: nonInteractivePrompt }, {});
		expect(answers).toEqual({
			cookies: { prefix: "app" },
			organization: false,
		});
	});

	it("plugin order does not affect which prompts are collected", async () => {
		const canonical = await buildTestGraph({
			config: defineConfig({
				app: { name: "app", domain: "example.com" },
				plugins: [
					cloudflare(),
					api(),
					db({ dialect: "d1", databaseId: "x" }),
					auth(),
				],
			}),
			cwd,
		});
		const shuffled = await buildTestGraph({
			config: defineConfig({
				app: { name: "app", domain: "example.com" },
				plugins: [
					auth(),
					db({ dialect: "d1", databaseId: "x" }),
					api(),
					cloudflare(),
				],
			}),
			cwd,
		});

		const canonicalPrompts = await canonical.graph.resolve(
			cliSlots.initPrompts,
		);
		const shuffledPrompts = await shuffled.graph.resolve(cliSlots.initPrompts);

		const names = (arr: typeof canonicalPrompts): string[] =>
			arr.map((p) => p.plugin).sort();
		expect(names(shuffledPrompts)).toEqual(names(canonicalPrompts));

		const canonicalAnswers = await collectPromptAnswers(canonicalPrompts);
		const shuffledAnswers = await collectPromptAnswers(shuffledPrompts);
		expect(shuffledAnswers).toEqual(canonicalAnswers);
	});

	it("plugins that declare no prompt contribute nothing to initPrompts", async () => {
		const { graph } = await buildTestGraph({
			config: defineConfig({
				app: { name: "app", domain: "example.com" },
				plugins: [cloudflare(), api(), vite()],
			}),
			cwd,
		});

		const prompts = await graph.resolve(cliSlots.initPrompts);
		// api/vite/cloudflare don't contribute to initPrompts today.
		expect(prompts).toHaveLength(0);
	});
});
