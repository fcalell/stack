import { describe, expect, it, vi } from "vitest";
import {
	findPluginCommand,
	formatPluginCommands,
	parseCommandFlags,
} from "#lib/command-router";
import { plugin } from "#lib/create-plugin";

const dbPlugin = plugin("db", {
	label: "Database",
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
});

const authPlugin = plugin("auth", {
	label: "Auth",
});

const plugins = [dbPlugin.cli, authPlugin.cli];

function getCommand(name: string) {
	const cmd = dbPlugin.cli.commands[name];
	if (!cmd) throw new Error(`Test setup: missing command '${name}'`);
	return cmd;
}

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
		const cmd = getCommand("apply");
		const flags = parseCommandFlags(cmd, ["--remote"]);
		expect(flags.remote).toBe(true);
	});

	it("uses defaults when flag not provided", () => {
		const cmd = getCommand("apply");
		const flags = parseCommandFlags(cmd, []);
		expect(flags.remote).toBe(false);
	});

	it("throws on unknown long flags with a helpful message", () => {
		const cmd = getCommand("apply");
		expect(() => parseCommandFlags(cmd, ["--unknown"])).toThrow(
			/Unknown flag "--unknown"/,
		);
	});

	it("throws on unknown short flags", () => {
		const cmd = getCommand("apply");
		expect(() => parseCommandFlags(cmd, ["-x"])).toThrow(/Unknown flag "-x"/);
	});

	it("passes positionals through without error", () => {
		const cmd = getCommand("apply");
		const flags = parseCommandFlags(cmd, ["positional", "--remote"]);
		expect(flags.remote).toBe(true);
	});

	it("accepts a long alias in place of the canonical name", () => {
		const cmd = {
			description: "Test",
			options: {
				yes: {
					type: "boolean" as const,
					description: "Yes",
					alias: "confirm",
					default: false,
				},
			},
			handler: vi.fn(),
		};
		const flags = parseCommandFlags(cmd, ["--confirm"]);
		expect(flags.yes).toBe(true);
	});

	it("accepts a single-char alias as a short flag", () => {
		const cmd = {
			description: "Test",
			options: {
				yes: {
					type: "boolean" as const,
					description: "Yes",
					alias: "y",
					default: false,
				},
			},
			handler: vi.fn(),
		};
		const flags = parseCommandFlags(cmd, ["-y"]);
		expect(flags.yes).toBe(true);
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

	it("returns empty object for command with no options when no flags passed", () => {
		const cmd = getCommand("push");
		const flags = parseCommandFlags(cmd, []);
		expect(flags).toEqual({});
	});

	it("throws when a string flag has no value at argv end", () => {
		const cmd = {
			description: "Test",
			options: {
				name: { type: "string" as const, description: "Name" },
			},
			handler: vi.fn(),
		};
		expect(() => parseCommandFlags(cmd, ["--name"])).toThrow(
			/Flag "--name" requires a string value/,
		);
	});

	it("throws when a string flag is followed by another flag instead of a value", () => {
		const cmd = {
			description: "Test",
			options: {
				name: { type: "string" as const, description: "Name" },
				remote: {
					type: "boolean" as const,
					description: "Remote",
					default: false,
				},
			},
			handler: vi.fn(),
		};
		expect(() => parseCommandFlags(cmd, ["--name", "--remote"])).toThrow(
			/Flag "--name" requires a string value/,
		);
	});

	it("throws when a number flag receives a non-numeric value", () => {
		const cmd = {
			description: "Test",
			options: {
				port: { type: "number" as const, description: "Port" },
			},
			handler: vi.fn(),
		};
		expect(() => parseCommandFlags(cmd, ["--port", "abc"])).toThrow(
			/Flag "--port" expects a number, got "abc"/,
		);
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
