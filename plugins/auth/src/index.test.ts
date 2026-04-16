import { describe, expect, it } from "vitest";
import { auth } from "./index";

describe("auth", () => {
	it("returns PluginConfig with __plugin 'auth'", () => {
		const config = auth();
		expect(config.__plugin).toBe("auth");
	});

	it("has requires: ['db']", () => {
		const config = auth();
		expect(config.requires).toEqual(["db"]);
	});

	it("defaults secretVar to AUTH_SECRET", () => {
		const config = auth();
		expect(config.options.secretVar).toBe("AUTH_SECRET");
	});

	it("defaults appUrlVar to APP_URL", () => {
		const config = auth();
		expect(config.options.appUrlVar).toBe("APP_URL");
	});

	it("defaults rate limiter IP binding and values", () => {
		const config = auth();
		expect(config.options.rateLimiter?.ip).toEqual({
			binding: "RATE_LIMITER_IP",
			limit: 100,
			period: 60,
		});
	});

	it("defaults rate limiter email binding and values", () => {
		const config = auth();
		expect(config.options.rateLimiter?.email).toEqual({
			binding: "RATE_LIMITER_EMAIL",
			limit: 5,
			period: 300,
		});
	});

	it("custom options override defaults", () => {
		const config = auth({
			secretVar: "MY_SECRET",
			appUrlVar: "MY_URL",
			rateLimiter: {
				ip: { binding: "CUSTOM_IP", limit: 50, period: 30 },
			},
		});
		expect(config.options.secretVar).toBe("MY_SECRET");
		expect(config.options.appUrlVar).toBe("MY_URL");
		expect(config.options.rateLimiter?.ip).toEqual({
			binding: "CUSTOM_IP",
			limit: 50,
			period: 30,
		});
	});

	it("throws when session.expiresIn is <= 0", () => {
		expect(() => auth({ session: { expiresIn: 0 } })).toThrow(
			"auth: session.expiresIn must be a positive number",
		);
		expect(() => auth({ session: { expiresIn: -1 } })).toThrow(
			"auth: session.expiresIn must be a positive number",
		);
	});

	it("accepts valid expiresIn", () => {
		const config = auth({ session: { expiresIn: 3600 } });
		expect(config.options.session?.expiresIn).toBe(3600);
	});

	it("accepts empty options (all defaults)", () => {
		const config = auth();
		expect(config.options).toMatchObject({
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
		});
		expect(config.requires).toEqual(["db"]);
	});

	it("passes through organization config", () => {
		const orgConfig = {
			ac: { statements: { project: ["create"] } },
			roles: { admin: {} },
			additionalFields: { logo: { type: "string" as const } },
		};
		const config = auth({ organization: orgConfig });
		expect(config.options.organization).toEqual(orgConfig);
	});

	it("passes through boolean organization config", () => {
		const config = auth({ organization: true });
		expect(config.options.organization).toBe(true);
	});

	it("passes through cookies config", () => {
		const config = auth({
			cookies: { prefix: "myapp", domain: ".example.com" },
		});
		expect(config.options.cookies).toEqual({
			prefix: "myapp",
			domain: ".example.com",
		});
	});

	it("passes through user additionalFields", () => {
		const config = auth({
			user: {
				additionalFields: {
					timezone: { type: "string" },
				},
			},
		});
		expect(config.options.user?.additionalFields?.timezone).toEqual({
			type: "string",
		});
	});

	it("passes through session additionalFields", () => {
		const config = auth({
			session: {
				additionalFields: {
					activeProjectId: { type: "string" },
				},
			},
		});
		expect(config.options.session?.additionalFields?.activeProjectId).toEqual({
			type: "string",
		});
	});
});
