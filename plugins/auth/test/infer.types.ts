import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { db } from "@fcalell/plugin-db";
import { auth } from "../src/index.ts";
import type { InferSession } from "../src/infer.ts";

// `tsc` runs over this file in `pnpm check`: a session that drifts from its
// config, or an `@ts-expect-error` line that stops erroring, fails the check.
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

const app = { name: "My App", domain: "example.com" };

// guide/config.md types the session as `InferSession<typeof config>`: it
// carries activeOrganizationId exactly when organization is configured.
const withOrganizations = defineConfig({
	app,
	plugins: [
		api(),
		db({ dialect: "sqlite", path: "app.sqlite" }),
		auth({ organization: true }),
	],
});
const withoutOrganizations = defineConfig({
	app,
	plugins: [
		api(),
		db({ dialect: "sqlite", path: "app.sqlite" }),
		auth({ emailOtp: false }),
	],
});
type WithOrganizations = InferSession<typeof withOrganizations>;
type WithoutOrganizations = InferSession<typeof withoutOrganizations>;
assertType<Equal<WithOrganizations["activeOrganizationId"], string | null>>(
	true,
);
assertType<
	Equal<"activeOrganizationId" extends keyof WithoutOrganizations ? 1 : 0, 0>
>(true);

// An option the schema does not declare fails type-checking, at any depth.
function _unknownOptions() {
	// @ts-expect-error `organisation` is no auth option
	auth({ emailOtp: false, organisation: true });
	// @ts-expect-error `rolez` is no organization option
	auth({ emailOtp: false, organization: { rolez: {} } });
}
