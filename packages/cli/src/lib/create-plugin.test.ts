import { describe, expect, it, vi } from "vitest";
import { callback, createPlugin } from "#lib/create-plugin";
import { createEventBus, defineEvent } from "#lib/event-bus";
import { createMockCtx } from "#testing";

describe("createPlugin", () => {
	describe("config factory (callable)", () => {
		it("returns a callable that produces PluginConfig", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				register() {},
			});

			const config = myPlugin({ value: 42 });
			expect(config.__plugin).toBe("test");
			expect(config.options).toEqual({ value: 42 });
		});

		it("runs config validation when provided", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				config(options: { port: number }) {
					if (options.port <= 0) throw new Error("Port must be positive");
					return options;
				},
				register() {},
			});

			expect(() => myPlugin({ port: -1 })).toThrow("Port must be positive");
			expect(myPlugin({ port: 3000 }).options.port).toBe(3000);
		});

		it("can be called without arguments when config() supplies defaults", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				config(options?: { value?: number }) {
					return { value: options?.value ?? 1 };
				},
				register() {},
			});

			const config = myPlugin();
			expect(config.__plugin).toBe("test");
			expect(config.options).toEqual({ value: 1 });
		});

		it("throws when options are omitted and no config() is defined", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				register() {},
			});

			expect(() => myPlugin()).toThrow(/requires options/);
		});

		it("stamps __package with the default @fcalell/plugin-<name> when not set", () => {
			const myPlugin = createPlugin("db", {
				label: "Database",
				config(options?: Record<string, unknown>) {
					return options ?? {};
				},
				register() {},
			});

			const config = myPlugin();
			expect(config.__package).toBe("@fcalell/plugin-db");
			expect(myPlugin.cli.package).toBe("@fcalell/plugin-db");
		});

		it("honours an explicit `package` option for third-party plugins", () => {
			const myPlugin = createPlugin("widget", {
				label: "Widget",
				package: "@acme/stack-plugin-widget",
				config(options?: Record<string, unknown>) {
					return options ?? {};
				},
				register() {},
			});

			const config = myPlugin();
			expect(config.__package).toBe("@acme/stack-plugin-widget");
			expect(myPlugin.cli.package).toBe("@acme/stack-plugin-widget");
		});
	});

	describe(".events", () => {
		it("creates typed Event<void> tokens from string array", () => {
			const myPlugin = createPlugin("db", {
				label: "Database",
				events: ["SchemaReady", "Migrated"],
				register() {},
			});

			expect(myPlugin.events.SchemaReady.source).toBe("db");
			expect(myPlugin.events.SchemaReady.name).toBe("SchemaReady");
			expect(typeof myPlugin.events.SchemaReady.id).toBe("symbol");

			expect(myPlugin.events.Migrated.source).toBe("db");
			expect(myPlugin.events.Migrated.name).toBe("Migrated");
		});

		it("events have unique symbol ids", () => {
			const myPlugin = createPlugin("db", {
				label: "Database",
				events: ["A", "B"],
				register() {},
			});

			expect(myPlugin.events.A.id).not.toBe(myPlugin.events.B.id);
		});

		it("events is empty object when no events declared", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				register() {},
			});

			expect(myPlugin.events).toEqual({});
		});
	});

	describe(".name", () => {
		it("exposes the plugin name", () => {
			const myPlugin = createPlugin("db", {
				label: "Database",
				register() {},
			});

			expect(myPlugin.name).toBe("db");
		});
	});

	describe(".cli", () => {
		it("exposes internal CLI plugin with correct metadata", () => {
			const dep = defineEvent<void>("other", "Ready");
			const myPlugin = createPlugin("db", {
				label: "Database",
				depends: [dep],
				register() {},
			});

			expect(myPlugin.cli.name).toBe("db");
			expect(myPlugin.cli.label).toBe("Database");
			expect(myPlugin.cli.depends).toContain(dep);
		});

		it("register delegates to definition.register", () => {
			const registerFn = vi.fn();
			const myPlugin = createPlugin("test", {
				label: "Test",
				register: registerFn,
			});

			const ctx = createMockCtx({ options: {} });
			const bus = createEventBus();

			myPlugin.cli.register(ctx, bus, {});
			expect(registerFn).toHaveBeenCalledWith(ctx, bus, {});
		});

		it("exposes commands from definition", () => {
			const handler = vi.fn();
			const myPlugin = createPlugin("db", {
				label: "Database",
				commands: {
					reset: {
						description: "Reset local database",
						handler,
					},
				},
				register() {},
			});

			expect(myPlugin.cli.commands.reset).toBeDefined();
			expect(myPlugin.cli.commands.reset?.description).toBe(
				"Reset local database",
			);
		});
	});

	describe(".defineCallbacks", () => {
		it("is present when callbacks are defined", () => {
			const myPlugin = createPlugin("auth", {
				label: "Auth",
				callbacks: {
					sendOTP: callback<{ email: string; code: string }>(),
				},
				register() {},
			});

			expect(myPlugin.defineCallbacks).toBeDefined();
		});

		it("returns the implementation object unchanged", () => {
			const myPlugin = createPlugin("auth", {
				label: "Auth",
				callbacks: {
					sendOTP: callback<{ email: string; code: string }>(),
				},
				register() {},
			});

			const impl = {
				sendOTP: async (_payload: { email: string; code: string }) => {
					// no-op
				},
			};

			const result = myPlugin.defineCallbacks(impl);
			expect(result).toBe(impl);
		});

		it("is not present when no callbacks are defined", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				register() {},
			});

			expect("defineCallbacks" in myPlugin).toBe(false);
		});
	});

	describe("event bus integration", () => {
		it("plugin can register handlers and emit events via the bus", async () => {
			const myPlugin = createPlugin("db", {
				label: "Database",
				events: ["SchemaReady"],
				register(_ctx, bus, _events) {
					bus.on(defineEvent<{ items: string[] }>("core", "generate"), (p) => {
						p.items.push("db-contribution");
					});
				},
			});

			const bus = createEventBus();
			const ctx = createMockCtx({ options: {} });
			myPlugin.cli.register(ctx, bus, myPlugin.events);
		});

		it("plugins can listen to shared event references", async () => {
			const sharedEvent = defineEvent<{ items: string[] }>("core", "generate");

			const pluginA = createPlugin("a", {
				label: "A",
				register(_ctx, bus) {
					bus.on(sharedEvent, (p) => {
						p.items.push("from-a");
					});
				},
			});

			const pluginB = createPlugin("b", {
				label: "B",
				register(_ctx, bus) {
					bus.on(sharedEvent, (p) => {
						p.items.push("from-b");
					});
				},
			});

			const bus = createEventBus();
			pluginA.cli.register(createMockCtx({ options: {} }), bus, pluginA.events);
			pluginB.cli.register(createMockCtx({ options: {} }), bus, pluginB.events);

			const result = await bus.emit(sharedEvent, { items: [] });
			expect(result.items).toEqual(["from-a", "from-b"]);
		});

		it("plugin can emit its own events", async () => {
			const myPlugin = createPlugin("db", {
				label: "Database",
				events: ["SchemaReady"],
				register(_ctx, bus, events) {
					bus.on(defineEvent<void>("core", "dev.ready"), async () => {
						await bus.emit(events.SchemaReady, undefined);
					});
				},
			});

			// Create a consumer that listens to the plugin event
			const schemaReadyHandler = vi.fn();
			const bus = createEventBus();

			myPlugin.cli.register(
				createMockCtx({ options: {} }),
				bus,
				myPlugin.events,
			);
			bus.on(myPlugin.events.SchemaReady, schemaReadyHandler);

			await bus.emit(myPlugin.events.SchemaReady, undefined);

			expect(schemaReadyHandler).toHaveBeenCalledTimes(1);
		});
	});

	describe("cross-plugin dependencies", () => {
		it("depends references carry source information for graph resolution", () => {
			const dbPlugin = createPlugin("db", {
				label: "Database",
				events: ["SchemaReady"],
				register() {},
			});

			const authPlugin = createPlugin("auth", {
				label: "Auth",
				depends: [dbPlugin.events.SchemaReady],
				register() {},
			});

			// The CLI uses event.source to build the dependency graph
			expect(authPlugin.cli.depends[0]?.source).toBe("db");
			expect(authPlugin.cli.depends[0]?.name).toBe("SchemaReady");
		});

		it("dependency order determines handler execution order", async () => {
			const sharedEvent = defineEvent<{ order: string[] }>(
				"core",
				"init.scaffold",
			);

			const db = createPlugin("db", {
				label: "Database",
				events: ["SchemaReady"],
				register(_ctx, bus) {
					bus.on(sharedEvent, (p) => {
						p.order.push("db");
					});
				},
			});

			const auth = createPlugin("auth", {
				label: "Auth",
				depends: [db.events.SchemaReady],
				register(_ctx, bus) {
					bus.on(sharedEvent, (p) => {
						p.order.push("auth");
					});
				},
			});

			const bus = createEventBus();
			// Register in dependency order (db before auth)
			db.cli.register(createMockCtx({ options: {} }), bus, db.events);
			auth.cli.register(createMockCtx({ options: {} }), bus, auth.events);

			const result = await bus.emit(sharedEvent, { order: [] });
			expect(result.order).toEqual(["db", "auth"]);
		});
	});
});
