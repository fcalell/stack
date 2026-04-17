import type { AuthRuntimeOptions } from "../types";

interface RuntimePlugin<TName extends string, TDeps, TProvides> {
	name: TName;
	validateEnv?(env: unknown): void;
	context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
	routes?(procedure: unknown): Record<string, unknown>;
}

export interface AuthCallbacks {
	sendOTP: (payload: { email: string; code: string }) => void | Promise<void>;
	sendInvitation: (payload: {
		email: string;
		orgName: string;
	}) => void | Promise<void>;
}

export default function authRuntime(
	options: AuthRuntimeOptions,
	callbacks?: AuthCallbacks,
): RuntimePlugin<"auth", { db: unknown }, { auth: unknown }> {
	return {
		name: "auth",
		validateEnv(env: unknown) {
			const e = env as Record<string, unknown>;
			if (!e[options.secretVar]) {
				throw new Error(`Missing env var: ${options.secretVar}`);
			}
		},
		context(env, upstream) {
			return { auth: { env, db: upstream.db, callbacks } };
		},
	};
}
