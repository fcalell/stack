import { createEventBus, Init, Remove } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { describe, expect, it, vi } from "vitest";
import { type AuthOptions, auth } from "./index";

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
	const defaultOptions: AuthOptions = {
		secretVar: "AUTH_SECRET",
		appUrlVar: "APP_URL",
		rateLimiter: {
			ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
			email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
		},
	};

	it("pushes scaffold files on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<AuthOptions>({ options: defaultOptions });
		auth.cli.register(ctx, bus, auth.events);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const callbacks = scaffold.files.find(
			(f) => f.target === "src/worker/plugins/auth.ts",
		);
		expect(callbacks).toBeDefined();
		// Auto-wired: createPlugin scaffolds templates/callbacks.ts when the
		// plugin declares both `callbacks` and `runtime`.
		expect(callbacks?.source.pathname.endsWith("templates/callbacks.ts")).toBe(
			true,
		);
		expect(scaffold.dependencies["@fcalell/plugin-auth"]).toBe("workspace:*");
	});

	it("pushes rate-limiter bindings + secrets on cloudflare.events.Wrangler", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<AuthOptions>({ options: defaultOptions });
		auth.cli.register(ctx, bus, auth.events);

		const wrangler = await bus.emit(cloudflare.events.Wrangler, {
			bindings: [],
			routes: [],
			vars: {},
			secrets: [],
			compatibilityDate: "2025-01-01",
		});

		expect(wrangler.bindings).toHaveLength(2);
		expect(wrangler.bindings[0]).toEqual({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_IP",
			simple: { limit: 100, period: 60 },
		});
		expect(wrangler.bindings[1]).toEqual({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_EMAIL",
			simple: { limit: 5, period: 300 },
		});
		expect(wrangler.secrets).toEqual([
			{ name: "AUTH_SECRET", devDefault: "dev-secret-change-me" },
			{ name: "APP_URL", devDefault: "http://localhost:3000" },
		]);
	});

	it("uses custom secret var names in wrangler payload", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<AuthOptions>({
			options: {
				...defaultOptions,
				secretVar: "MY_SECRET",
				appUrlVar: "MY_URL",
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const wrangler = await bus.emit(cloudflare.events.Wrangler, {
			bindings: [],
			routes: [],
			vars: {},
			secrets: [],
			compatibilityDate: "2025-01-01",
		});
		expect(wrangler.secrets[0]?.name).toBe("MY_SECRET");
		expect(wrangler.secrets[1]?.name).toBe("MY_URL");
	});

	it("uses custom rate limiter bindings", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<AuthOptions>({
			options: {
				...defaultOptions,
				rateLimiter: {
					ip: { binding: "CUSTOM_IP", limit: 50, period: 30 },
					email: { binding: "CUSTOM_EMAIL", limit: 10, period: 600 },
				},
			},
		});
		auth.cli.register(ctx, bus, auth.events);

		const wrangler = await bus.emit(cloudflare.events.Wrangler, {
			bindings: [],
			routes: [],
			vars: {},
			secrets: [],
			compatibilityDate: "2025-01-01",
		});
		expect(wrangler.bindings[0]).toEqual({
			kind: "rate_limiter",
			binding: "CUSTOM_IP",
			simple: { limit: 50, period: 30 },
		});
		expect(wrangler.bindings[1]).toEqual({
			kind: "rate_limiter",
			binding: "CUSTOM_EMAIL",
			simple: { limit: 10, period: 600 },
		});
	});

	it("threads p.cors into trustedOrigins on api.events.Worker", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<AuthOptions>({ options: defaultOptions });
		auth.cli.register(ctx, bus, auth.events);

		const cors = ["https://example.com", "https://app.example.com"];
		const worker = await bus.emit(api.events.Worker, {
			imports: [],
			base: null,
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
			cors,
		});

		const entry = worker.pluginRuntimes.find((r) => r.plugin === "auth");
		expect(entry).toBeDefined();
		expect(entry?.identifier).toBe("authRuntime");
		expect(entry?.options.trustedOrigins).toEqual({
			kind: "array",
			items: cors.map((o) => ({ kind: "string", value: o })),
		});
	});

	it("omits trustedOrigins when p.cors is empty", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<AuthOptions>({ options: defaultOptions });
		auth.cli.register(ctx, bus, auth.events);

		const worker = await bus.emit(api.events.Worker, {
			imports: [],
			base: null,
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
			cors: [],
		});

		const entry = worker.pluginRuntimes.find((r) => r.plugin === "auth");
		expect(entry).toBeDefined();
		expect(entry?.options.trustedOrigins).toBeUndefined();
	});

	it("wires callbacks onto the runtime entry when callback file exists", async () => {
		// Callback → runtime wiring lives in plugin-api's api.events.Worker
		// handler; it walks ctx.discoveredPlugins for plugins declaring both
		// callbacks and a ./runtime export, and attaches the generated import
		// when the convention file exists. We register api alongside auth and
		// seed both contexts with discoveredPlugins so api's handler can see
		// auth's callback declaration.
		const bus = createEventBus();
		const discoveredPlugins = [
			{
				name: auth.cli.name,
				package: auth.cli.package,
				callbacks: auth.cli.callbacks,
			},
			{
				name: api.cli.name,
				package: api.cli.package,
				callbacks: api.cli.callbacks,
			},
		];
		const fileExists = async (p: string) => p === "src/worker/plugins/auth.ts";
		const authCtx = createMockCtx<AuthOptions>({
			options: defaultOptions,
			fileExists,
			discoveredPlugins,
		});
		auth.cli.register(authCtx, bus, auth.events);
		const apiCtx = createMockCtx({
			options: {},
			fileExists,
			discoveredPlugins,
		});
		api.cli.register(apiCtx, bus, api.events);

		const worker = await bus.emit(api.events.Worker, {
			imports: [],
			base: null,
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
			cors: [],
		});

		const entry = worker.pluginRuntimes.find((r) => r.plugin === "auth");
		expect(entry?.callbacks).toEqual({
			import: {
				source: "../src/worker/plugins/auth",
				default: "authCallbacks",
			},
			identifier: "authCallbacks",
		});
	});

	it("pushes cleanup info on Remove", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<AuthOptions>({ options: defaultOptions });
		auth.cli.register(ctx, bus, auth.events);

		const removal = await bus.emit(Remove, {
			files: [],
			dependencies: [],
			devDependencies: [],
		});
		expect(removal.files).toContain("src/worker/plugins/auth.ts");
		expect(removal.dependencies).toContain("@fcalell/plugin-auth");
	});
});
