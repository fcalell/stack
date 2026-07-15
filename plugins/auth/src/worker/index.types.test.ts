import { createProcedure } from "@fcalell/plugin-api/procedure";
import { describe, expectTypeOf, it } from "vitest";
import type { AuthApi } from "./index";

// `TOptions["organization"]` gates `hasPermission`: it mirrors what `buildAuth`
// (./index.ts) actually registers with better-auth.
type NoOrgOptions = { secretVar: string; appUrlVar: string };
type OrgOptions = { secretVar: string; appUrlVar: string; organization: true };

describe("AuthApi<TOptions>.hasPermission is conditional on organization", () => {
	it("is absent when organization isn't enabled", () => {
		expectTypeOf<AuthApi<NoOrgOptions>>().not.toHaveProperty("hasPermission");
	});

	it("is present when organization is enabled", () => {
		expectTypeOf<AuthApi<OrgOptions>>().toHaveProperty("hasPermission");
	});
});

// Downstream effect on plugins/api's `createProcedure`: `context.auth` carries
// the real, conditionally-typed `AuthApi<TOptions>` (via `ResolvedContext`'s
// `TBase &` intersection), so a handler that reaches for
// `context.auth.api.hasPermission` (the same member `createRbacMiddleware`
// calls at runtime) type-checks only when the auth context actually has it.
describe("procedure() context surfaces the same gate", () => {
	const orgProcedure = createProcedure<{
		auth: { api: AuthApi<OrgOptions> };
	}>();
	const noOrgProcedure = createProcedure<{
		auth: { api: AuthApi<NoOrgOptions> };
	}>();

	it("org-enabled auth context: hasPermission is callable", () => {
		orgProcedure({ auth: true, org: true }).handler(({ context }) => {
			return context.auth.api.hasPermission({
				headers: new Headers(),
				body: { permissions: {} },
			});
		});
	});

	it("non-org auth context: hasPermission is not callable", () => {
		noOrgProcedure({ auth: true, org: true }).handler(({ context }) => {
			// @ts-expect-error: hasPermission doesn't exist on AuthApi<NoOrgOptions>
			return context.auth.api.hasPermission({
				headers: new Headers(),
				body: { permissions: {} },
			});
		});
	});
});
