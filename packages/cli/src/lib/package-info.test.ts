import { describe, expect, it } from "vitest";
import { findPackageInfo } from "#lib/package-info";

describe("findPackageInfo", () => {
	it("locates an installed workspace package and returns its parsed package.json", () => {
		const info = findPackageInfo("@fcalell/plugin-api");

		expect(info).not.toBeNull();
		expect(info?.pkgJson.name).toBe("@fcalell/plugin-api");
		expect(typeof info?.root).toBe("string");
	});

	it("returns null when the package cannot be resolved", () => {
		expect(findPackageInfo("nonexistent-package-zzz-xyz")).toBeNull();
	});

	it("memoizes results — repeated calls return the same object reference", () => {
		const first = findPackageInfo("@fcalell/plugin-api");
		const second = findPackageInfo("@fcalell/plugin-api");
		expect(second).toBe(first);

		const firstNull = findPackageInfo("nonexistent-cache-probe-xyz");
		const secondNull = findPackageInfo("nonexistent-cache-probe-xyz");
		expect(firstNull).toBeNull();
		expect(secondNull).toBeNull();
	});
});
