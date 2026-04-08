import type { AuthPolicy, DatabaseConfig } from "@fcalell/db";
import { getSchemaModule } from "@fcalell/db";
import { createAuth } from "@fcalell/db/auth/factory";
import type {
	AuthEnvConfig,
	InvitationCallbackData,
	OTPCallbackData,
} from "@fcalell/db/auth/factory";
import { createClient as createD1Client } from "@fcalell/db/d1";
import type { AnyD1Database, DrizzleD1Database } from "drizzle-orm/d1";
import { type CorsOrigin, createApp } from "#app";
import { createAuthRouter } from "#internal/auth-router";
import type { RateLimitBinding } from "#internal/rate-limiter";
import { createProcedure } from "#procedure";
import type { Procedure } from "#types";

type DefaultStatements = Record<string, readonly string[]>;

type ExtractSchemaModule<TConfig> = TConfig extends {
	schema: { module: infer M extends Record<string, unknown> };
}
	? M
	: TConfig extends { schema: infer M extends Record<string, unknown> }
		? M
		: Record<string, unknown>;

type ExtractStatements<TConfig> = TConfig extends {
	auth: {
		organization: { ac: { statements: infer S extends DefaultStatements } };
	};
}
	? S
	: Record<string, string[]>;

interface EnvConfig {
	db: AnyD1Database;
	auth?: AuthEnvConfig;
	rateLimiter?: {
		ip?: RateLimitBinding;
		email?: RateLimitBinding;
	};
	devMode?: boolean;
}

interface AppDefinition<
	TBindings extends Record<string, unknown>,
	TConfig extends DatabaseConfig,
	_TStatements extends DefaultStatements,
> {
	db: TConfig;
	env: (env: TBindings) => EnvConfig;
	cors?: CorsOrigin;
	prefix?: `/${string}`;
	sendOTP?: (data: OTPCallbackData<TBindings>) => Promise<void>;
	sendInvitation?: (data: InvitationCallbackData<TBindings>) => Promise<void>;
}

interface InternalContext {
	_headers?: Headers;
	_rateLimiter?: {
		ip?: RateLimitBinding;
		email?: RateLimitBinding;
	};
	_devMode?: boolean;
}

type FrameworkContext<
	TBindings extends Record<string, unknown>,
	TSchema extends Record<string, unknown>,
> = {
	db: DrizzleD1Database<TSchema>;
	// biome-ignore lint/suspicious/noExplicitAny: auth instance type is complex and inferred via $Infer at usage
	auth: any;
	env: TBindings;
};

export function defineApp<
	TBindings extends Record<string, unknown>,
	TConfig extends DatabaseConfig,
	TStatements extends DefaultStatements = ExtractStatements<TConfig>,
>(definition: AppDefinition<TBindings, TConfig, TStatements>) {
	type TSchema = ExtractSchemaModule<TConfig>;
	type Ctx = FrameworkContext<TBindings, TSchema>;

	const procedure = createProcedure<Ctx, TStatements>();

	const authPolicy: AuthPolicy | undefined = definition.db.auth;
	const authRouter = authPolicy
		? createAuthRouter(procedure, procedure.auth(), {
				policy: authPolicy,
				emailOTP: !!definition.sendOTP,
			})
		: undefined;

	// biome-ignore lint/suspicious/noExplicitAny: auth router procedures are dynamically generated
	type AuthRoutes = TConfig extends { auth: AuthPolicy }
		? { auth: Record<string, Procedure<any, any>> }
		: {};

	return {
		procedure,

		handler<TRoutes extends Record<string, unknown>>(routes: TRoutes) {
			const dbConfig = definition.db;
			const schemaModule = getSchemaModule(dbConfig);

			const fullRouter = authRouter
				? { auth: authRouter, ...routes }
				: routes;

			const honoApp = createApp<TBindings, Ctx>({
				router: fullRouter,
				context: ({ env, req }) => {
					const envConfig = definition.env(env);

					const d1 = envConfig.db;
					if (!d1) {
						throw new Error("D1 binding not provided in env callback");
					}

					const db: DrizzleD1Database<TSchema> = createD1Client(
						d1,
						schemaModule,
						// biome-ignore lint/suspicious/noExplicitAny: schema module type preserved via ExtractSchemaModule generic
					) as any;

					if (dbConfig.auth && !envConfig.auth) {
						throw new Error(
							"Auth is configured in database config but env callback did not return auth config. " +
								"Provide auth: { secret: string } in your env callback.",
						);
					}

					const auth =
						dbConfig.auth && envConfig.auth
							? createAuth({
									db,
									policy: dbConfig.auth,
									env: envConfig.auth,
									bindings: env,
									baseURL: new URL(req.url).origin,
									corsOrigins: normalizeCorsOrigins(definition.cors),
									sendOTP: definition.sendOTP,
									sendInvitation: definition.sendInvitation,
								})
							: undefined;

					const ctx: Ctx & InternalContext = { db, auth, env };
					if (envConfig.rateLimiter) {
						ctx._rateLimiter = envConfig.rateLimiter;
					}
					if (envConfig.devMode) {
						ctx._devMode = true;
					}

					return ctx as Ctx;
				},
				cors: definition.cors,
				prefix: definition.prefix,
			});

			type FullRouter = AuthRoutes & TRoutes;
			return honoApp as typeof honoApp & { _router: FullRouter };
		},
	};
}

function normalizeCorsOrigins(
	cors: CorsOrigin | undefined,
): string[] | undefined {
	if (!cors) return undefined;
	if (typeof cors === "string") return [cors];
	if (Array.isArray(cors)) return cors;
	return undefined;
}
