import { describe, expect, it } from "vitest";
import { app } from "./index";

describe("app", () => {
	it("returns PluginConfig with __plugin 'app'", () => {
		const result = app();
		expect(result.__plugin).toBe("app");
	});

	it("has no requires field", () => {
		const result = app();
		expect(result.requires).toBeUndefined();
	});

	it("defaults options to empty object", () => {
		const result = app();
		expect(result.options).toEqual({});
	});

	it("preserves custom routes config", () => {
		const result = app({ routes: { pagesDir: "src/pages" } });
		expect(result.options.routes).toEqual({ pagesDir: "src/pages" });
	});

	it("routes: false disables routing", () => {
		const result = app({ routes: false });
		expect(result.options.routes).toBe(false);
	});

	it("preserves custom pagesDir", () => {
		const result = app({ routes: { pagesDir: "src/views" } });
		expect(result.options.routes).toEqual({ pagesDir: "src/views" });
	});

	it("preserves custom domain", () => {
		const result = app({ domain: "example.com" });
		expect(result.options.domain).toBe("example.com");
	});

	it("preserves all options together", () => {
		const result = app({
			routes: { pagesDir: "src/pages" },
			domain: "example.com",
		});
		expect(result.options).toEqual({
			routes: { pagesDir: "src/pages" },
			domain: "example.com",
		});
	});

	it("returns undefined options when called with undefined", () => {
		const result = app(undefined);
		expect(result.options).toEqual({});
	});
});
