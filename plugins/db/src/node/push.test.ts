import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DbOptions } from "../types";

vi.mock("node:child_process", () => ({
	spawnSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

// Cast to vi.fn to avoid overload assignability issues with Buffer types
const mockedSpawnSync = spawnSync as unknown as ReturnType<typeof vi.fn>;
const mockedExistsSync = vi.mocked(existsSync);
const mockedMkdirSync = mkdirSync as unknown as ReturnType<typeof vi.fn>;
const mockedReaddirSync = readdirSync as unknown as ReturnType<typeof vi.fn>;
const mockedReadFileSync = readFileSync as unknown as ReturnType<typeof vi.fn>;
const mockedWriteFileSync = writeFileSync as unknown as ReturnType<
	typeof vi.fn
>;

import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	pushSchemaLocal,
} from "./push";

function mockSpawnSuccess(stdout = "", stderr = "") {
	return {
		status: 0,
		stdout: Buffer.from(stdout),
		stderr: Buffer.from(stderr),
		pid: 1234,
		output: [],
		signal: null,
	};
}

function mockSpawnFailure(stderr = "command failed") {
	return {
		status: 1,
		stdout: Buffer.from(""),
		stderr: Buffer.from(stderr),
		pid: 1234,
		output: [],
		signal: null,
	};
}

const defaultOptions: DbOptions = {
	dialect: "d1",
	databaseId: "test-db-id",
	binding: "DB_MAIN",
	migrations: "./src/migrations",
};

afterEach(() => {
	vi.clearAllMocks();
});

describe("pushSchemaLocal", () => {
	it("creates config directory and writes drizzle config", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());

		await pushSchemaLocal("/project", defaultOptions);

		expect(mockedMkdirSync).toHaveBeenCalledWith(
			join("/project", ".stack", "dev"),
			{ recursive: true },
		);
		expect(mockedWriteFileSync).toHaveBeenCalledWith(
			join("/project", ".stack", "dev", "drizzle.config.ts"),
			expect.stringContaining('dialect: "sqlite"'),
			"utf-8",
		);
	});

	it("writes config pointing at local.db", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());

		await pushSchemaLocal("/project", defaultOptions);

		const writtenContent = mockedWriteFileSync.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain(".stack/dev/local.db");
		expect(writtenContent).toContain("./src/schema/index.ts");
		expect(writtenContent).toContain("defineConfig(");
	});

	it("runs drizzle-kit push with the config path", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());

		await pushSchemaLocal("/project", defaultOptions);

		expect(mockedSpawnSync).toHaveBeenCalledWith(
			"npx",
			[
				"drizzle-kit",
				"push",
				"--config",
				join("/project", ".stack", "dev", "drizzle.config.ts"),
			],
			expect.objectContaining({ cwd: "/project", stdio: "pipe" }),
		);
	});

	it("throws on command failure", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnFailure("push failed"));

		await expect(pushSchemaLocal("/project", defaultOptions)).rejects.toThrow(
			"push failed",
		);
	});

	it("points at options.path for sqlite dialect", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());
		const sqliteOptions: DbOptions = {
			dialect: "sqlite",
			path: "./data/app.sqlite",
		};

		await pushSchemaLocal("/project", sqliteOptions);

		const writtenContent = mockedWriteFileSync.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain("./data/app.sqlite");
		expect(writtenContent).not.toContain(".stack/dev/local.db");
	});
});

describe("generateMigrations", () => {
	it("writes a generate-specific drizzle config", async () => {
		mockedExistsSync.mockReturnValue(false);
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());
		mockedReaddirSync.mockReturnValue([]);

		await generateMigrations("/project", defaultOptions);

		const writtenContent = mockedWriteFileSync.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain("./src/migrations");
		expect(writtenContent).toContain("./src/schema/index.ts");
	});

	it("runs drizzle-kit generate", async () => {
		mockedExistsSync.mockReturnValue(false);
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());
		mockedReaddirSync.mockReturnValue([]);

		await generateMigrations("/project", defaultOptions);

		expect(mockedSpawnSync).toHaveBeenCalledWith(
			"npx",
			[
				"drizzle-kit",
				"generate",
				"--config",
				join("/project", ".stack", "dev", "drizzle-generate.config.ts"),
			],
			expect.objectContaining({ cwd: "/project" }),
		);
	});

	it("returns new migration files", async () => {
		// First call: existsSync for migrations dir (before generate) — no existing dir
		// Second call: existsSync for migrations dir (after generate) — dir now exists
		mockedExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());
		mockedReaddirSync.mockReturnValue(["0001_create_users.sql" as string]);
		mockedReadFileSync.mockReturnValue(
			"CREATE TABLE users (id TEXT PRIMARY KEY);",
		);

		const result = await generateMigrations("/project", defaultOptions);

		expect(result).toEqual([
			{
				name: "0001_create_users.sql",
				sql: "CREATE TABLE users (id TEXT PRIMARY KEY);",
			},
		]);
	});

	it("excludes pre-existing files", async () => {
		// First existsSync: migrations dir exists before generate
		mockedExistsSync.mockReturnValue(true);
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());
		// First readdirSync: existing files before generate
		mockedReaddirSync.mockReturnValueOnce(["0001_existing.sql" as string]);
		// Second readdirSync: after generate, includes both old and new
		mockedReaddirSync.mockReturnValueOnce([
			"0001_existing.sql" as string,
			"0002_new_table.sql" as string,
		]);
		mockedReadFileSync.mockReturnValue("CREATE TABLE posts (id TEXT);");

		const result = await generateMigrations("/project", defaultOptions);

		expect(result).toEqual([
			{ name: "0002_new_table.sql", sql: "CREATE TABLE posts (id TEXT);" },
		]);
	});

	it("uses custom migrations path", async () => {
		const customOptions: DbOptions = {
			...defaultOptions,
			migrations: "./custom/migrations",
		};
		mockedExistsSync.mockReturnValue(false);
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());
		mockedReaddirSync.mockReturnValue([]);

		await generateMigrations("/project", customOptions);

		const writtenContent = mockedWriteFileSync.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain("./custom/migrations");
	});

	it("throws on command failure", async () => {
		mockedExistsSync.mockReturnValue(false);
		mockedSpawnSync.mockReturnValue(mockSpawnFailure("generate failed"));

		await expect(
			generateMigrations("/project", defaultOptions),
		).rejects.toThrow("generate failed");
	});
});

describe("applyMigrationsRemote", () => {
	it("runs wrangler d1 migrations apply --remote", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());

		await applyMigrationsRemote("/project", defaultOptions);

		expect(mockedSpawnSync).toHaveBeenCalledWith(
			"npx",
			["wrangler", "d1", "migrations", "apply", "test-db-id", "--remote"],
			expect.objectContaining({ cwd: "/project" }),
		);
	});

	it("throws for sqlite dialect", async () => {
		const sqliteOptions: DbOptions = {
			dialect: "sqlite",
			path: "./local.db",
		};

		await expect(
			applyMigrationsRemote("/project", sqliteOptions),
		).rejects.toThrow("Remote migrations not supported for sqlite dialect");
	});

	it("does not shell out for sqlite dialect", async () => {
		const sqliteOptions: DbOptions = {
			dialect: "sqlite",
			path: "./local.db",
		};

		await expect(
			applyMigrationsRemote("/project", sqliteOptions),
		).rejects.toThrow();
		expect(mockedSpawnSync).not.toHaveBeenCalled();
	});

	it("throws on command failure", async () => {
		mockedSpawnSync.mockReturnValue(
			mockSpawnFailure("authentication required"),
		);

		await expect(
			applyMigrationsRemote("/project", defaultOptions),
		).rejects.toThrow("authentication required");
	});
});

describe("applyMigrationsLocal", () => {
	it("runs wrangler d1 migrations apply --local for d1 dialect", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());

		await applyMigrationsLocal("/project", defaultOptions);

		expect(mockedSpawnSync).toHaveBeenCalledWith(
			"npx",
			["wrangler", "d1", "migrations", "apply", "test-db-id", "--local"],
			expect.objectContaining({ cwd: "/project" }),
		);
	});

	it("runs drizzle-kit migrate for sqlite dialect", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnSuccess());
		const sqliteOptions: DbOptions = {
			dialect: "sqlite",
			path: "./data/app.sqlite",
			migrations: "./src/migrations",
		};

		await applyMigrationsLocal("/project", sqliteOptions);

		expect(mockedSpawnSync).toHaveBeenCalledWith(
			"npx",
			[
				"drizzle-kit",
				"migrate",
				"--config",
				join("/project", ".stack", "dev", "drizzle-migrate.config.ts"),
			],
			expect.objectContaining({ cwd: "/project" }),
		);
		const writtenContent = mockedWriteFileSync.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain('dialect: "sqlite"');
		expect(writtenContent).toContain("./data/app.sqlite");
	});

	it("throws for d1 dialect when databaseId is missing", async () => {
		const noIdOptions: DbOptions = { dialect: "d1" };

		await expect(applyMigrationsLocal("/project", noIdOptions)).rejects.toThrow(
			"no databaseId configured",
		);
	});

	it("throws on command failure", async () => {
		mockedSpawnSync.mockReturnValue(mockSpawnFailure("local apply failed"));

		await expect(
			applyMigrationsLocal("/project", defaultOptions),
		).rejects.toThrow("local apply failed");
	});
});
