import type { StackConfig } from "@fcalell/config";
import type { AuthPolicy } from "@fcalell/db";
import { getSchemaModule } from "@fcalell/db";
import { createClient as createD1Client } from "@fcalell/db/d1";
import type { AnyD1Database, DrizzleD1Database } from "drizzle-orm/d1";
import { type CorsOrigin, createApp } from "#app";
import type {
	AuthEnvConfig,
	InvitationCallbackData,
	OTPCallbackData,
} from "#internal/auth-factory";
import { createAuth } from "#internal/auth-factory";
import { createAuthRouter } from "#internal/auth-router";
import type { RateLimitBinding } from "#internal/rate-limiter";
import { createProcedure } from "#procedure";
import type { Procedure } from "#types";

type DefaultStatements = Record<string, readonly string[]>;

type ExtractSchemaModule<TConfig extends StackConfig> = TConfig["db"] extends {
	schema: { module: infer M extends Record<string, unknown> };
}
	? M
	: TConfig["db"] extends { schema: infer M extends Record<string, unknown> }
		? M
		: Record<string, unknown>;

type ExtractStatements<TConfig extends StackConfig> = TConfig extends {
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
	TConfig extends StackConfig,
	_TStatements extends DefaultStatements,
> {
	config: TConfig;
	env: (env: TBindings) => EnvConfig;
	sendOTP?: (data: OTPCallbackData<TBindings>) => Promise<void>;
	sendInvitation?: (data: InvitationCallbackData<TBindings>) => Promise<void>;
}

type FrameworkContext<
	TBindings extends Record<string, unknown>,
	TSchema extends Record<string, unknown>,
> = {
	db: DrizzleD1Database<TSchema>;
	// biome-ignore lint/suspicious/noExplicitAny: auth instance type is complex and inferred via $Infer at usage
	auth: any;
	env: TBindings;
	reqHeaders: Headers;
	resHeaders: Headers;
};

export function defineApp<
	TBindings extends Record<string, unknown>,
	TConfig extends StackConfig,
	TStatements extends DefaultStatements = ExtractStatements<TConfig>,
>(definition: AppDefinition<TBindings, TConfig, TStatements>) {
	type TSchema = ExtractSchemaModule<TConfig>;
	type Ctx = FrameworkContext<TBindings, TSchema>;

	const procedure = createProcedure<Ctx, TStatements>();

	const authPolicy: AuthPolicy | undefined = definition.config.auth;
	const authRouter = authPolicy
		? createAuthRouter(procedure, {
				policy: authPolicy,
				emailOTP: !!definition.sendOTP,
			})
		: undefined;

	type AuthRoutes = TConfig extends { auth: AuthPolicy }
		? { auth: Record<string, Procedure<unknown, unknown>> }
		: Record<never, never>;

	return {
		procedure,

		handler<TRoutes extends Record<string, unknown>>(routes: TRoutes) {
			const dbConfig = definition.config.db;
			const schemaModule = getSchemaModule(dbConfig);

			const fullRouter = authRouter ? { auth: authRouter, ...routes } : routes;

			const cors = definition.config.api?.cors;
			const prefix = definition.config.api?.prefix;

			const honoApp = createApp<TBindings, Ctx>({
				router: fullRouter,
				context: ({ env, req }) => {
					const envConfig = definition.env(env);

					const d1 = envConfig.db;
					if (!d1) {
						throw new Error("D1 binding not provided in env callback");
					}

					// Schema module type is erased by getSchemaModule(); restore the
					// compile-time generic so the Drizzle client is properly typed.
					const typedSchema = schemaModule as TSchema;
					const db = createD1Client(d1, typedSchema);

					if (authPolicy && !envConfig.auth) {
						throw new Error(
							"Auth is configured but env callback did not return auth config. " +
								"Provide auth: { secret: string } in your env callback.",
						);
					}

					const auth =
						authPolicy && envConfig.auth
							? createAuth({
									db,
									policy: authPolicy,
									env: envConfig.auth,
									bindings: env,
									baseURL: new URL(req.url).origin,
									corsOrigins: normalizeCorsOrigins(cors),
									sendOTP: definition.sendOTP,
									sendInvitation: definition.sendInvitation,
								})
							: undefined;

					// reqHeaders/resHeaders are injected by the oRPC
					// Request/Response Headers plugins before middleware runs.
					const ctx = {
						db,
						auth,
						env,
						_rateLimiter: envConfig.rateLimiter,
						_devMode: envConfig.devMode,
					};
					return ctx as unknown as Ctx;
				},
				cors,
				prefix,
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
