export type { AuthPolicy, DatabaseConfig, FieldConfig } from "@fcalell/db";

import type { AuthPolicy, DatabaseConfig } from "@fcalell/db";

interface ApiConfig {
	cors?: string | string[];
	prefix?: `/${string}`;
}

interface DevConfig {
	studioPort?: number;
}

export interface StackConfig {
	db: DatabaseConfig;
	auth?: AuthPolicy;
	api?: ApiConfig;
	dev?: DevConfig;
}

function validate(config: StackConfig): void {
	if (!config.db || typeof config.db !== "object") {
		throw new Error("defineConfig: db is required and must be an object");
	}

	const dialect = config.db.dialect as string;
	if (dialect !== "d1" && dialect !== "sqlite") {
		throw new Error(
			`defineConfig: db.dialect must be "d1" or "sqlite", got "${dialect}"`,
		);
	}

	if (!config.db.schema || typeof config.db.schema !== "object") {
		throw new Error(
			"defineConfig: db.schema is required and must be an object",
		);
	}

	if (config.db.dialect === "d1") {
		if (
			typeof config.db.databaseId !== "string" ||
			config.db.databaseId.length === 0
		) {
			throw new Error(
				'defineConfig: db.databaseId is required when dialect is "d1"',
			);
		}
	}

	if (config.db.dialect === "sqlite") {
		if (typeof config.db.path !== "string" || config.db.path.length === 0) {
			throw new Error(
				'defineConfig: db.path is required when dialect is "sqlite"',
			);
		}
	}

	if (
		config.db.migrations !== undefined &&
		(typeof config.db.migrations !== "string" ||
			config.db.migrations.length === 0)
	) {
		throw new Error(
			"defineConfig: db.migrations must be a non-empty string if provided",
		);
	}

	if (config.api?.prefix !== undefined && !config.api.prefix.startsWith("/")) {
		throw new Error('defineConfig: api.prefix must start with "/"');
	}

	if (config.api?.cors !== undefined) {
		const cors = config.api.cors;
		if (
			typeof cors !== "string" &&
			(!Array.isArray(cors) || !cors.every((c) => typeof c === "string"))
		) {
			throw new Error(
				"defineConfig: api.cors must be a string or array of strings",
			);
		}
	}

	if (config.dev?.studioPort !== undefined) {
		if (
			typeof config.dev.studioPort !== "number" ||
			!Number.isInteger(config.dev.studioPort) ||
			config.dev.studioPort <= 0
		) {
			throw new Error(
				"defineConfig: dev.studioPort must be a positive integer",
			);
		}
	}

	if (config.auth?.session?.expiresIn !== undefined) {
		if (
			typeof config.auth.session.expiresIn !== "number" ||
			config.auth.session.expiresIn <= 0
		) {
			throw new Error(
				"defineConfig: auth.session.expiresIn must be a positive number",
			);
		}
	}
}

export function defineConfig<T extends StackConfig>(config: T): T {
	validate(config);
	return config;
}
