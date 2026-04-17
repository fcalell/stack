import { describe, expect, it, vi } from "vitest";
import {
	findPluginCommand,
	formatPluginCommands,
	parseCommandFlags,
} from "#lib/command-router";
import { createPlugin } from "#lib/create-plugin";

const dbPlugin = createPlugin("db", {
	label: "Database",
	events: ["SchemaReady"],
	commands: {
		push: {
			description: "Push schema to local database",
			handler: vi.fn(),
		},
		reset: {
			description: "Reset local database",
			handler: vi.fn(),
		},
		apply: {
			description: "Apply pending migrations",
			options: {
				remote: {
					type: "boolean" as const,
					description: "Apply to remote D1",
					default: false,
				},
			},
			handler: vi.fn(),
		},
	},
	register() {},
});

const authPlugin = createPlugin("auth", {
	label: "Auth",
	register() {},
});

const plugins = [dbPlugin.cli, authPlugin.cli];

describe("findPluginCommand", () => {
	it("finds a command by plugin and command name", () => {
		const match = findPluginCommand(plugins, "db", "push");
		expect(match).not.toBeNull();
		expect(match?.plugin.name).toBe("db");
		expect(match?.commandName).toBe("push");
		expect(match?.command.description).toBe("Push schema to local database");
	});

	it("returns null for unknown plugin", () => {
		expect(findPluginCommand(plugins, "unknown", "push")).toBeNull();
	});

	it("returns null for unknown command", () => {
		expect(findPluginCommand(plugins, "db", "unknown")).toBeNull();
	});

	it("returns null for plugin with no commands", () => {
		expect(findPluginCommand(plugins, "auth", "anything")).toBeNull();
	});
});

describe("parseCommandFlags", () => {
	it("parses boolean flags", () => {
		const cmd = dbPlugin.cli.commands.apply!;
		const flags = parseCommandFlags(cmd, ["--remote"]);
		expect(flags.remote).toBe(true);
	});

	it("uses defaults when flag not provided", () => {
		const cmd = dbPlugin.cli.commands.apply!;
		const flags = parseCommandFlags(cmd, []);
		expect(flags.remote).toBe(false);
	});

	it("ignores unknown flags", () => {
		const cmd = dbPlugin.cli.commands.apply!;
		const flags = parseCommandFlags(cmd, ["--unknown", "--remote"]);
		expect(flags.remote).toBe(true);
		expect(flags.unknown).toBeUndefined();
	});

	it("parses string flags", () => {
		const cmd = {
			description: "Test",
			options: {
				name: { type: "string" as const, description: "Name" },
			},
			handler: vi.fn(),
		};
		const flags = parseCommandFlags(cmd, ["--name", "hello"]);
		expect(flags.name).toBe("hello");
	});

	it("parses number flags", () => {
		const cmd = {
			description: "Test",
			options: {
				port: { type: "number" as const, description: "Port", default: 3000 },
			},
			handler: vi.fn(),
		};
		const flags = parseCommandFlags(cmd, ["--port", "8080"]);
		expect(flags.port).toBe(8080);
	});

	it("returns empty object for command with no options", () => {
		const cmd = dbPlugin.cli.commands.push!;
		const flags = parseCommandFlags(cmd, ["--anything"]);
		expect(flags).toEqual({});
	});
});

describe("formatPluginCommands", () => {
	it("formats commands for display", () => {
		const output = formatPluginCommands(plugins);
		expect(output).toContain("db push");
		expect(output).toContain("Push schema to local database");
		expect(output).toContain("db reset");
		expect(output).toContain("db apply");
	});

	it("skips plugins with no commands", () => {
		const output = formatPluginCommands(plugins);
		expect(output).not.toContain("auth");
	});

	it("returns empty string when no plugins have commands", () => {
		const output = formatPluginCommands([authPlugin.cli]);
		expect(output).toBe("");
	});
});
