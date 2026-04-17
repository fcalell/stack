import type { RuntimePlugin } from "@fcalell/cli/runtime";
import type { AuthRuntimeOptions } from "../types";

export interface AuthCallbacks {
	sendOTP: (payload: { email: string; code: string }) => void | Promise<void>;
	sendInvitation: (payload: {
		email: string;
		orgName: string;
	}) => void | Promise<void>;
}

// Runtime options bundle: codegen inlines plugin options and (optionally)
// the callback import into a single object passed to this factory.
export interface AuthRuntimeInput extends AuthRuntimeOptions {
	callbacks?: AuthCallbacks;
	sameSite?: "strict" | "lax" | "none";
}

export default function authRuntime(
	options: AuthRuntimeInput,
): RuntimePlugin<"auth", { db: unknown }, { auth: unknown }> {
	const { callbacks, ...authOptions } = options;
	return {
		name: "auth",
		validateEnv(env: unknown) {
			const e = env as Record<string, unknown>;
			if (!e[authOptions.secretVar]) {
				throw new Error(`Missing env var: ${authOptions.secretVar}`);
			}
		},
		context(env, upstream) {
			return { auth: { env, db: upstream.db, callbacks } };
		},
	};
}
