import { describe, expect, it } from "vitest";
import { assertDeployableDatabaseId, D1_PLACEHOLDER_ID } from "./d1";

// Guards the d1 deploy footgun: shipping the placeholder (or a pasted database
// *name* instead of the UUID) would push migrations at a non-existent database
// and fail opaquely deep inside wrangler. The guard turns that into an
// actionable error before any cloud mutation.
describe("assertDeployableDatabaseId", () => {
	it("throws on the placeholder id", () => {
		expect(() => assertDeployableDatabaseId(D1_PLACEHOLDER_ID)).toThrow(
			/placeholder/,
		);
	});

	it("throws when databaseId is missing", () => {
		expect(() => assertDeployableDatabaseId(undefined)).toThrow(/placeholder/);
	});

	it("throws on a non-UUID value (e.g. a pasted database name)", () => {
		expect(() => assertDeployableDatabaseId("my-database")).toThrow(
			/not a valid/,
		);
	});

	it("accepts a real UUID", () => {
		expect(() =>
			assertDeployableDatabaseId("9a619a0b-1234-4abc-89de-0123456789ab"),
		).not.toThrow();
	});
});
