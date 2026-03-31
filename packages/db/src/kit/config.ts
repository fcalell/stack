interface FieldConfig {
	type: "string" | "number" | "boolean";
	required?: boolean;
}

interface AuthConfig {
	emailOTP?: boolean;
	organization?:
		| boolean
		| {
				additionalFields?: Record<string, FieldConfig>;
		  };
	session?: {
		additionalFields?: Record<string, FieldConfig>;
	};
	user?: {
		additionalFields?: Record<string, FieldConfig>;
	};
}

interface BaseConfig {
	schema: string;
	migrations: string;
	studioPort?: number;
	auth?: AuthConfig;
}

interface D1Config extends BaseConfig {
	dialect: "d1";
	databaseId: string;
	binding: string;
	wranglerDir: string;
}

interface SqliteConfig extends BaseConfig {
	dialect: "sqlite";
	path: string;
}

export type DatabaseConfig = D1Config | SqliteConfig;
export type { AuthConfig, FieldConfig };

export function defineDatabase<T extends DatabaseConfig>(config: T): T {
	return config;
}
