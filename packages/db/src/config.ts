export interface FieldConfig {
	type: "string" | "number" | "boolean" | "date";
	required?: boolean;
}

/** Structural shape of an access control instance (compatible with better-auth's AccessControl) */
export interface AccessControlLike {
	statements: Record<string, readonly string[]>;
	newRole: (...args: never[]) => unknown;
}

export interface AuthPolicy {
	cookies?: {
		prefix?: string;
		domain?: string;
	};
	session?: {
		expiresIn?: number;
		updateAge?: number;
		additionalFields?: Record<string, FieldConfig>;
	};
	user?: {
		additionalFields?: Record<string, FieldConfig>;
	};
	organization?:
		| boolean
		| {
				ac?: import("better-auth/plugins/access").AccessControl;
				// biome-ignore lint/suspicious/noExplicitAny: better-auth's OrganizationOptions expects Role<any>
				roles?: Record<string, import("better-auth/plugins/access").Role<any>>;
				additionalFields?: Record<string, FieldConfig>;
		  };
}

type SchemaInput =
	| Record<string, unknown>
	| { path: string; module: Record<string, unknown> };

interface BaseConfig {
	schema: SchemaInput;
	migrations?: string;
}

interface D1Config extends BaseConfig {
	dialect: "d1";
	databaseId: string;
}

interface SqliteConfig extends BaseConfig {
	dialect: "sqlite";
	path: string;
}

export type DatabaseConfig = D1Config | SqliteConfig;

const DEFAULT_SCHEMA_PATH = "./src/schema";
const DEFAULT_MIGRATIONS_PATH = "./src/migrations";

function isSchemaWithPath(
	schema: SchemaInput,
): schema is { path: string; module: Record<string, unknown> } {
	return (
		"path" in schema &&
		typeof schema.path === "string" &&
		"module" in schema &&
		typeof schema.module === "object" &&
		schema.module !== null
	);
}

export function getSchemaPath(config: DatabaseConfig): string {
	if (isSchemaWithPath(config.schema)) {
		return config.schema.path;
	}
	return DEFAULT_SCHEMA_PATH;
}

export function getSchemaModule(
	config: DatabaseConfig,
): Record<string, unknown> {
	if (isSchemaWithPath(config.schema)) {
		return config.schema.module;
	}
	return config.schema;
}

export function getMigrationsPath(config: DatabaseConfig): string {
	return config.migrations ?? DEFAULT_MIGRATIONS_PATH;
}
