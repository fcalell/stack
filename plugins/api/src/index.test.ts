import { describe, expect, it } from "vitest";
import { api } from "./index";

describe("api config factory", () => {
	it("returns PluginConfig with __plugin: 'api'", () => {
		const config = api();
		expect(config.__plugin).toBe("api");
	});

	it("has no requires field", () => {
		const config = api();
		expect(config.requires).toBeUndefined();
	});

	it("default prefix is /rpc", () => {
		const config = api();
		expect(config.options.prefix).toBe("/rpc");
	});

	it("custom prefix is preserved", () => {
		const config = api({ prefix: "/api" });
		expect(config.options.prefix).toBe("/api");
	});

	it("throws when prefix doesn't start with /", () => {
		// @ts-expect-error testing runtime validation
		expect(() => api({ prefix: "rpc" })).toThrow(
			"api: prefix must start with /",
		);
	});

	it("throws when cors is invalid type", () => {
		// @ts-expect-error testing runtime validation
		expect(() => api({ cors: 123 })).toThrow(
			"api: cors must be a string or array of strings",
		);
	});

	it("accepts cors as string", () => {
		const config = api({ cors: "https://example.com" });
		expect(config.options.cors).toBe("https://example.com");
	});

	it("accepts cors as string array", () => {
		const origins = ["https://a.com", "https://b.com"];
		const config = api({ cors: origins });
		expect(config.options.cors).toEqual(origins);
	});

	it("accepts no options (all defaults)", () => {
		const config = api();
		expect(config.options.prefix).toBe("/rpc");
		expect(config.options.cors).toBeUndefined();
		expect(config.options.domain).toBeUndefined();
	});

	it("custom domain is preserved", () => {
		const config = api({ domain: "api.example.com" });
		expect(config.options.domain).toBe("api.example.com");
	});
});
