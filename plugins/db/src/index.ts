import type { PluginConfig } from "@fcalell/config";

export interface FieldConfig {
	type: "string" | "number" | "boolean" | "date";
	required?: boolean;
}

type SchemaInput<TSchema> = TSchema | { path: string; module: TSchema };

export interface DbOptions<TSchema = unknown> {
	dialect: "d1" | "sqlite";
	databaseId?: string;
	path?: string;
	schema: SchemaInput<TSchema>;
	migrations?: string;
	binding?: string;
}

const DEFAULT_SCHEMA_PATH = "./src/schema";
const DEFAULT_MIGRATIONS_PATH = "./src/migrations";

function isSchemaWithPath<T>(
	schema: SchemaInput<T>,
): schema is { path: string; module: T } {
	return (
		typeof schema === "object" &&
		schema !== null &&
		"path" in schema &&
		typeof (schema as Record<string, unknown>).path === "string" &&
		"module" in schema &&
		typeof (schema as Record<string, unknown>).module === "object" &&
		(schema as Record<string, unknown>).module !== null
	);
}

export function getSchemaPath<TSchema>(options: DbOptions<TSchema>): string {
	if (isSchemaWithPath(options.schema)) {
		return options.schema.path;
	}
	return DEFAULT_SCHEMA_PATH;
}

export function getSchemaModule<TSchema>(options: DbOptions<TSchema>): TSchema {
	if (isSchemaWithPath(options.schema)) {
		return options.schema.module;
	}
	return options.schema;
}

export function getMigrationsPath<TSchema>(
	options: DbOptions<TSchema>,
): string {
	return options.migrations ?? DEFAULT_MIGRATIONS_PATH;
}

export function db<TSchema extends Record<string, unknown>>(
	options: DbOptions<TSchema>,
): PluginConfig<"db", DbOptions<TSchema>> {
	if (options.dialect === "d1" && !options.databaseId) {
		throw new Error("db: D1 dialect requires databaseId");
	}
	if (options.dialect === "sqlite" && !options.path) {
		throw new Error("db: SQLite dialect requires path");
	}
	if (!options.schema || typeof options.schema !== "object") {
		throw new Error("db: schema is required");
	}

	return {
		__plugin: "db",
		options: {
			binding: "DB_MAIN",
			migrations: DEFAULT_MIGRATIONS_PATH,
			...options,
		},
	};
}
