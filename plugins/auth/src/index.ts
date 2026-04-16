import type { PluginConfig } from "@fcalell/config";

export interface FieldConfig {
	type: "string" | "number" | "boolean";
	required?: boolean;
	defaultValue?: unknown;
	input?: boolean;
}

export interface AuthOptions {
	cookies?: { prefix?: string; domain?: string };
	session?: {
		expiresIn?: number;
		updateAge?: number;
		additionalFields?: Record<string, FieldConfig>;
	};
	user?: { additionalFields?: Record<string, FieldConfig> };
	organization?:
		| boolean
		| {
				ac?: unknown;
				roles?: Record<string, unknown>;
				additionalFields?: Record<string, FieldConfig>;
		  };
	secretVar?: string;
	appUrlVar?: string;
	rateLimiter?: {
		ip?: { binding?: string; limit?: number; period?: number };
		email?: { binding?: string; limit?: number; period?: number };
	};
}

export function auth(
	options: AuthOptions = {},
): PluginConfig<"auth", AuthOptions> {
	if (
		options.session?.expiresIn !== undefined &&
		options.session.expiresIn <= 0
	) {
		throw new Error("auth: session.expiresIn must be a positive number");
	}
	return {
		__plugin: "auth",
		requires: ["db"],
		options: {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
			...options,
		},
	};
}

export { type AuthCallbacks, defineAuthCallbacks } from "./callbacks";
