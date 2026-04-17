import type { RegisterContext } from "@fcalell/cli";
import { discoverPlugins, sortByDependencies } from "@fcalell/cli/discovery";
import { createEventBus, Init } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { type AuthOptions, auth } from "@fcalell/plugin-auth";
import { type DbOptions, db } from "@fcalell/plugin-db";
import { describe, expect, it } from "vitest";

// Build a non-interactive RegisterContext that mirrors the production
// `createPromptContext({ nonInteractive: true })` helper — text returns the
// default, select returns the first option, confirm returns false, multiselect
// returns []. This is what `stack init --plugins db,auth` constructs when no
// TTY is attached.
function createNonInteractiveCtx<T>(options: T): RegisterContext<T> {
	const prompt: RegisterContext<T>["prompt"] = {
		text: async (_msg, opts) => opts?.default ?? "",
		confirm: async () => false,
		select: async <U>(
			_msg: string,
			opts: { label: string; value: U }[],
		): Promise<U> => {
			const first = opts[0];
			if (!first) throw new Error("select called with no options");
			return first.value;
		},
		multiselect: async <U>(): Promise<U[]> => [],
	};
	return createMockCtx({ options, prompt });
}

const dbCtxOptions: DbOptions = { dialect: "d1", databaseId: "placeholder" };
const authCtxOptions: AuthOptions = {};

describe("Init.Prompt in non-interactive mode", () => {
	it("db plugin handler pushes dialect + databaseId into configOptions", async () => {
		const bus = createEventBus();
		const ctx = createNonInteractiveCtx(dbCtxOptions);
		db.cli.register(ctx, bus, db.events);

		const payload = await bus.emit(Init.Prompt, { configOptions: {} });

		// First option in select is "d1"; text default is "YOUR_D1_DATABASE_ID".
		expect(payload.configOptions.db).toEqual({
			dialect: "d1",
			databaseId: "YOUR_D1_DATABASE_ID",
		});
	});

	it("auth plugin handler pushes cookies + organization into configOptions", async () => {
		const bus = createEventBus();
		const ctx = createNonInteractiveCtx(authCtxOptions);
		auth.cli.register(ctx, bus, auth.events);

		const payload = await bus.emit(Init.Prompt, { configOptions: {} });

		// Cookie prefix default is "app"; confirm returns false in non-interactive.
		expect(payload.configOptions.auth).toEqual({
			cookies: { prefix: "app" },
			organization: false,
		});
	});

	it("emits across multiple plugins and accumulates answers keyed by plugin name", async () => {
		const config = {
			domain: "app.example.com",
			plugins: [db({ dialect: "d1", databaseId: "placeholder" }), auth({})],
			validate: () => ({ valid: true, errors: [] }),
		};
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);

		const bus = createEventBus();
		for (const p of sorted) {
			const ctx = createNonInteractiveCtx(p.options);
			p.cli.register(ctx, bus, p.events);
		}

		const payload = await bus.emit(Init.Prompt, { configOptions: {} });

		expect(Object.keys(payload.configOptions).sort()).toEqual(["auth", "db"]);
		expect(payload.configOptions.db).toMatchObject({ dialect: "d1" });
		expect(payload.configOptions.auth).toMatchObject({
			cookies: { prefix: "app" },
		});
	});
});

describe("Init.Prompt → pluginAnswers wiring (mirrors init.ts merge)", () => {
	// This test mirrors the exact merge loop in `init.ts`:
	//   const prompt = await bus.emit(Init.Prompt, { configOptions: {} });
	//   for (const [name, answers] of Object.entries(prompt.configOptions)) {
	//     if (pluginAnswers.has(name)) pluginAnswers.set(name, answers);
	//   }
	// It proves the plugin-supplied answers end up in the map consumed by
	// `stackConfigTemplate`, which is what turns them into `db({ dialect: "d1" })`
	// inside the scaffolded `stack.config.ts`.

	it("pluginAnswers collects each plugin's configOptions after Init.Prompt", async () => {
		const config = {
			plugins: [db({ dialect: "d1", databaseId: "abc" }), auth({})],
			validate: () => ({ valid: true, errors: [] }),
		};
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);

		const bus = createEventBus();
		const pluginAnswers = new Map<string, Record<string, unknown>>();
		for (const p of sorted) {
			const ctx = createNonInteractiveCtx(p.options);
			p.cli.register(ctx, bus, p.events);
			pluginAnswers.set(p.name, {});
		}

		const promptPayload = await bus.emit(Init.Prompt, { configOptions: {} });
		for (const [name, answers] of Object.entries(promptPayload.configOptions)) {
			if (pluginAnswers.has(name)) pluginAnswers.set(name, answers);
		}

		expect(pluginAnswers.get("db")).toMatchObject({ dialect: "d1" });
		expect(pluginAnswers.get("auth")).toMatchObject({
			cookies: { prefix: "app" },
			organization: false,
		});
	});

	it("unselected plugins do not appear in pluginAnswers even if they register", async () => {
		// If a plugin's Init.Prompt handler runs but the plugin wasn't
		// pre-registered in `pluginAnswers` (because it wasn't selected),
		// the init merge step should ignore that configOptions key.
		const bus = createEventBus();
		const pluginAnswers = new Map<string, Record<string, unknown>>();
		pluginAnswers.set("db", {});

		// Register both but only "db" is "selected".
		const ctxDb = createNonInteractiveCtx(dbCtxOptions);
		db.cli.register(ctxDb, bus, db.events);
		const ctxAuth = createNonInteractiveCtx(authCtxOptions);
		auth.cli.register(ctxAuth, bus, auth.events);

		const promptPayload = await bus.emit(Init.Prompt, { configOptions: {} });
		for (const [name, answers] of Object.entries(promptPayload.configOptions)) {
			if (pluginAnswers.has(name)) pluginAnswers.set(name, answers);
		}

		expect(pluginAnswers.has("db")).toBe(true);
		expect(pluginAnswers.has("auth")).toBe(false);
		expect(pluginAnswers.get("db")).toMatchObject({ dialect: "d1" });
	});
});
