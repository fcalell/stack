import { z } from "zod";

export const fieldConfigSchema = z.object({
	type: z.enum(["string", "number", "boolean"]),
	required: z.boolean().optional(),
	defaultValue: z.unknown().optional(),
	input: z.boolean().optional(),
});

export type FieldConfig = z.infer<typeof fieldConfigSchema>;

const rateLimiterIpSchema = z
	.object({
		binding: z.string().default("RATE_LIMITER_IP"),
		limit: z
			.number()
			.positive({ error: "auth: rateLimiter.limit must be a positive number" })
			.default(100),
		period: z
			.number()
			.positive({ error: "auth: rateLimiter.period must be a positive number" })
			.default(60),
	})
	.default({ binding: "RATE_LIMITER_IP", limit: 100, period: 60 });

const rateLimiterEmailSchema = z
	.object({
		binding: z.string().default("RATE_LIMITER_EMAIL"),
		limit: z
			.number()
			.positive({ error: "auth: rateLimiter.limit must be a positive number" })
			.default(5),
		period: z
			.number()
			.positive({ error: "auth: rateLimiter.period must be a positive number" })
			.default(300),
	})
	.default({ binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 });

const organizationObjectSchema = z.object({
	ac: z.unknown().optional(),
	roles: z.record(z.string(), z.unknown()).optional(),
	additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
});

export const authOptionsSchema = z.object({
	cookies: z
		.object({
			prefix: z.string().optional(),
			domain: z.string().optional(),
		})
		.optional(),
	session: z
		.object({
			// `positive` emits a "too_small" issue whose path is
			// ["session", "expiresIn"] — the path substring satisfies the
			// `.toThrow("expiresIn")` assertion.
			expiresIn: z
				.number()
				.positive({
					error: "auth: session.expiresIn must be a positive number",
				})
				.optional(),
			updateAge: z.number().optional(),
			additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
		})
		.optional(),
	user: z
		.object({
			additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
		})
		.optional(),
	organization: z.union([z.boolean(), organizationObjectSchema]).optional(),
	secretVar: z.string().default("AUTH_SECRET"),
	appUrlVar: z.string().default("APP_URL"),
	rateLimiter: z
		.object({
			ip: rateLimiterIpSchema,
			email: rateLimiterEmailSchema,
		})
		.default({
			ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
			email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
		}),
});

// Input type: user-supplied options (defaults remain optional at input).
export type AuthOptions = z.input<typeof authOptionsSchema>;

export interface AuthRuntimeOptions {
	secretVar: string;
	appUrlVar: string;
}
