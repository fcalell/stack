import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callback, createPlugin, type } from "#lib/create-plugin";
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

		it("validates via the provided schema", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				schema: z.object({
					port: z
						.number()
						.refine((p) => p > 0, { error: "Port must be positive" }),
				}),
				register() {},
			});

			expect(() => myPlugin({ port: -1 })).toThrow("Port must be positive");
			expect(myPlugin({ port: 3000 }).options.port).toBe(3000);
		});

		it("can be called without arguments when the schema supplies defaults", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				schema: z.object({ value: z.number().default(1) }),
				register() {},
			});

			const config = myPlugin();
			expect(config.__plugin).toBe("test");
			expect(config.options).toEqual({ value: 1 });
		});

		it("passes options through when no schema is defined", () => {
			const myPlugin = createPlugin("test", {
				label: "Test",
				register() {},
			});

			expect(myPlugin().options).toEqual({});
		});

		it("stamps __package with the default @fcalell/plugin-<name> when not set", () => {
			const myPlugin = createPlugin("db", {
				label: "Database",
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

		it("accepts a typed-payload map built with `type<T>()`", async () => {
			interface WorkerPayload {
				bindings: string[];
			}

			const myPlugin = createPlugin("worker-owner", {
				label: "Worker Owner",
				events: {
					Worker: type<WorkerPayload>(),
					Ready: type<void>(),
				},
				register() {},
			});

			expect(myPlugin.events.Worker.source).toBe("worker-owner");
			expect(myPlugin.events.Worker.name).toBe("Worker");
			expect(myPlugin.events.Ready.source).toBe("worker-owner");
			expect(typeof myPlugin.events.Worker.id).toBe("symbol");
			expect(myPlugin.events.Worker.id).not.toBe(myPlugin.events.Ready.id);

			// End-to-end: emit a typed payload and receive it in a handler.
			const bus = createEventBus();
			const handler = vi.fn();
			bus.on(myPlugin.events.Worker, handler);
			const received = await bus.emit(myPlugin.events.Worker, {
				bindings: ["DB_MAIN"],
			});
			expect(received).toEqual({ bindings: ["DB_MAIN"] });
			expect(handler).toHaveBeenCalledWith({ bindings: ["DB_MAIN"] });
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
				after: [dep],
				register() {},
			});

			expect(myPlugin.cli.name).toBe("db");
			expect(myPlugin.cli.label).toBe("Database");
			expect(myPlugin.cli.after).toContain(dep);
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
			// createPlugin stamps `plugin`/`template`/`scaffold` onto ctx before
			// forwarding to the user's register function. Everything else passes
			// through verbatim.
			expect(registerFn).toHaveBeenCalledTimes(1);
			const [receivedCtx, receivedBus, receivedEvents] =
				registerFn.mock.calls[0] ?? [];
			expect(receivedCtx).toMatchObject({
				cwd: ctx.cwd,
				options: ctx.options,
				plugin: "test",
			});
			expect(typeof receivedCtx.template).toBe("function");
			expect(typeof receivedCtx.scaffold).toBe("function");
			expect(receivedBus).toBe(bus);
			expect(receivedEvents).toEqual({});
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
		it("after references carry source information for graph resolution", () => {
			const dbPlugin = createPlugin("db", {
				label: "Database",
				events: ["SchemaReady"],
				register() {},
			});

			const authPlugin = createPlugin("auth", {
				label: "Auth",
				after: [dbPlugin.events.SchemaReady],
				register() {},
			});

			// The CLI uses event.source to build the dependency graph
			expect(authPlugin.cli.after[0]?.source).toBe("db");
			expect(authPlugin.cli.after[0]?.name).toBe("SchemaReady");
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
				after: [db.events.SchemaReady],
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
