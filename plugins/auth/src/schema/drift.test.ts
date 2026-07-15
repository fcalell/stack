import { getAuthTables } from "better-auth/db";
import { describe, expect, it } from "vitest";
import authRuntime from "../worker/index";
import { account, session, user, verification } from "./index";
import { invitation, member, organization } from "./organization";

// WS2.4 drift test — sailward's `auth.cli.ts` trick inverted for CI. Builds
// the REAL runtime (the same `authRuntime` the worker imports) with
// placeholder credentials, then asks better-auth itself — via
// `getAuthTables` (`better-auth/db`), the same introspection
// `@better-auth/cli generate` uses — what tables/columns it expects. No live
// DB connection: `drizzleAdapter` is only constructed here, never queried
// (the same pattern plugins/auth/src/runtime.test.ts already relies on).
//
// Required direction: every table/column better-auth expects must exist in
// our static Drizzle schema. Enabling a future table-bearing plugin
// (twoFactor, …) without updating schema.ts turns this red.

const baseOpts = { secretVar: "AUTH_SECRET", appUrlVar: "APP_URL" };
const validEnv = {
	AUTH_SECRET: "test-secret-value",
	APP_URL: "http://localhost:3000",
};
const mockDb = { mock: true };

type BetterAuthTables = ReturnType<typeof getAuthTables>;

// Our static schema, keyed by better-auth model name. Drizzle table objects
// carry each column as a plain enumerable own property (verified against the
// real `drizzle-orm` build), so `table[fieldKey]` is exactly the column
// better-auth would read/write for that field.
// biome-ignore lint/suspicious/noExplicitAny: drizzle column objects — only `.name`/`.dataType` are read below.
const ourTables: Record<string, Record<string, any>> = {
	user,
	session,
	account,
	verification,
	organization,
	member,
	invitation,
};

function assertSchemaCoversTables(tables: BetterAuthTables): void {
	// Non-vacuous guard: an empty `tables` map would make the loop below pass
	// trivially. better-auth always expects at least `user`.
	expect(Object.keys(tables)).toContain("user");
	for (const [modelName, def] of Object.entries(tables)) {
		const table = ourTables[def.modelName ?? modelName];
		if (!table) {
			throw new Error(
				`better-auth expects a "${modelName}" table that plugins/auth/src/schema ` +
					"doesn't declare. Add it (schema/index.ts for always-present tables, " +
					"a new schema/<plugin>.ts + subpath export for plugin-gated ones) and " +
					"wire it into buildAuth's drizzleAdapter schema map " +
					"(plugins/auth/src/worker/index.ts).",
			);
		}
		// `id` is implicit on every better-auth model — never listed in `.fields`.
		expect(table.id, `${modelName}.id`).toBeDefined();
		for (const [fieldKey, field] of Object.entries(def.fields)) {
			const column = table[fieldKey];
			expect(
				column,
				`${modelName}.${fieldKey} — better-auth field has no matching Drizzle column`,
			).toBeDefined();
			if (typeof field.type === "string") {
				expect(column.dataType, `${modelName}.${fieldKey} dataType`).toBe(
					field.type,
				);
			}
		}
	}
}

function pluginIds(auth: { options: { plugins?: Array<{ id?: string }> } }) {
	return (auth.options.plugins ?? []).map((p) => p.id);
}

describe("schema drift — static Drizzle schema vs. better-auth's expectations", () => {
	it("declares every table/column the base runtime config expects", () => {
		const { auth } = authRuntime(baseOpts).context(
			{ ...validEnv },
			{ db: mockDb },
		) as unknown as { auth: { options: Parameters<typeof getAuthTables>[0] } };
		assertSchemaCoversTables(getAuthTables(auth.options));
	});

	it("declares every table/column the organization:true runtime config expects", () => {
		const { auth } = authRuntime({
			...baseOpts,
			organization: true,
		}).context({ ...validEnv }, { db: mockDb }) as unknown as {
			auth: { options: Parameters<typeof getAuthTables>[0] };
		};
		assertSchemaCoversTables(getAuthTables(auth.options));
	});

	// Reverse direction, scoped sanely: the forward assertions above would
	// vacuously pass if the organization plugin were silently never
	// registered. Confirms it's wired exactly when the option says so — the
	// same registration `buildAuth` gates its drizzleAdapter schema map on.
	it("registers the organization plugin iff the option is enabled", () => {
		const off = authRuntime(baseOpts).context(
			{ ...validEnv },
			{ db: mockDb },
		) as unknown as { auth: { options: { plugins?: Array<{ id?: string }> } } };
		const on = authRuntime({ ...baseOpts, organization: true }).context(
			{ ...validEnv },
			{ db: mockDb },
		) as unknown as { auth: { options: { plugins?: Array<{ id?: string }> } } };

		expect(pluginIds(off.auth)).not.toContain("organization");
		expect(pluginIds(on.auth)).toContain("organization");
	});
});
