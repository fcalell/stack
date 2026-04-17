import type { RegisterContext } from "@fcalell/cli";
import { createEventBus, Generate, Init, Remove } from "@fcalell/cli/events";
import { describe, expect, it, vi } from "vitest";
import { type AuthOptions, auth } from "./index";

function createMockCtx(
	overrides: Partial<RegisterContext<AuthOptions>> & { options: AuthOptions },
): RegisterContext<AuthOptions> {
	return {
		cwd: "/tmp/test",
		hasPlugin: () => false,
		readFile: vi.fn(async () => ""),
		fileExists: vi.fn(async () => false),
		log: {
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
		},
		prompt: {
			text: vi.fn(async () => ""),
			confirm: vi.fn(async () => false),
			select: vi.fn(async () => undefined as never),
			multiselect: vi.fn(async () => []),
		},
		...overrides,
	};
}

describe("auth config factory", () => {
	it("returns PluginConfig with __plugin 'auth'", () => {
		const config = auth({});
		expect(config.__plugin).toBe("auth");
	});

	it("defaults secretVar to AUTH_SECRET", () => {
		const config = auth({});
		expect(config.options.secretVar).toBe("AUTH_SECRET");
	});

	it("defaults appUrlVar to APP_URL", () => {
		const config = auth({});
		expect(config.options.appUrlVar).toBe("APP_URL");
	});

	it("defaults rate limiter IP binding and values", () => {
		const config = auth({});
		expect(config.options.rateLimiter?.ip).toEqual({
			binding: "RATE_LIMITER_IP",
			limit: 100,
			period: 60,
		});
	});

	it("defaults rate limiter email binding and values", () => {
		const config = auth({});
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
		const config = auth({});
		expect(config.options).toMatchObject({
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
		});
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

describe("auth.events", () => {
	it("has no custom events", () => {
		expect(Object.keys(auth.events)).toHaveLength(0);
	});
});

describe("auth.cli", () => {
	it("has correct name and label", () => {
		expect(auth.cli.name).toBe("auth");
		expect(auth.cli.label).toBe("Auth");
	});
});

describe("auth.defineCallbacks", () => {
	it("is present", () => {
		expect(auth.defineCallbacks).toBeDefined();
		expect(typeof auth.defineCallbacks).toBe("function");
	});

	it("returns the callbacks object as-is", () => {
		const cbs = {
			sendOTP: vi.fn(),
			sendInvitation: vi.fn(),
		};
		expect(auth.defineCallbacks(cbs)).toBe(cbs);
	});
});

describe("auth register", () => {
	it("pushes scaffold files on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				rateLimiter: {
					ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
					email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
				},
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		expect(scaffold.files).toContainEqual({
			path: "src/worker/plugins/auth.ts",
			content: expect.stringContaining("defineCallbacks"),
		});
		expect(scaffold.dependencies["@fcalell/plugin-auth"]).toBe("workspace:*");
	});

	it("pushes bindings on Generate", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				rateLimiter: {
					ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
					email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
				},
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.bindings).toHaveLength(4);
		expect(gen.bindings.map((b) => b.name)).toEqual([
			"AUTH_SECRET",
			"APP_URL",
			"RATE_LIMITER_IP",
			"RATE_LIMITER_EMAIL",
		]);
	});

	it("uses custom secret var names in bindings", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				secretVar: "MY_SECRET",
				appUrlVar: "MY_URL",
				rateLimiter: {
					ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
					email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
				},
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.bindings[0]?.name).toBe("MY_SECRET");
		expect(gen.bindings[1]?.name).toBe("MY_URL");
	});

	it("uses custom rate limiter bindings", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				rateLimiter: {
					ip: { binding: "CUSTOM_IP", limit: 50, period: 30 },
					email: { binding: "CUSTOM_EMAIL", limit: 10, period: 600 },
				},
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.bindings[2]?.name).toBe("CUSTOM_IP");
		expect(gen.bindings[2]?.rateLimit).toEqual({ limit: 50, period: 30 });
		expect(gen.bindings[3]?.name).toBe("CUSTOM_EMAIL");
		expect(gen.bindings[3]?.rateLimit).toEqual({ limit: 10, period: 600 });
	});

	it("includes dev defaults for secret bindings", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				rateLimiter: {
					ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
					email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
				},
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.bindings[0]?.devDefault).toBe("dev-secret-change-me");
		expect(gen.bindings[1]?.devDefault).toBe("http://localhost:3000");
	});

	it("pushes cleanup info on Remove", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				rateLimiter: {
					ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
					email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
				},
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const removal = await bus.emit(Remove, {
			files: [],
			dependencies: [],
		});
		expect(removal.files).toContain("src/worker/plugins/auth.ts");
		expect(removal.dependencies).toContain("@fcalell/plugin-auth");
	});
});
