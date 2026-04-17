import type { FieldConfig } from "./types";

type FieldType<F extends FieldConfig> = F["type"] extends "string"
	? string
	: F["type"] extends "number"
		? number
		: F["type"] extends "boolean"
			? boolean
			: never;

type InferAdditionalFields<T> =
	T extends Record<string, FieldConfig>
		? {
				[K in keyof T]: T[K] extends { required: true }
					? FieldType<T[K]>
					: FieldType<T[K]> | null;
			}
		: Record<never, never>;

type BaseUser = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type BaseSession = {
	id: string;
	userId: string;
	expiresAt: Date;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type ExtractAuthOptions<TConfig> = TConfig extends {
	auth: { options: infer O };
}
	? O
	: TConfig extends { auth: infer A }
		? A
		: never;

type OrgSessionFields<TOptions> = TOptions extends { organization: infer O }
	? O extends false
		? Record<never, never>
		: { activeOrganizationId: string | null }
	: Record<never, never>;

export type InferUser<TConfig extends { auth?: unknown }> = BaseUser &
	(ExtractAuthOptions<TConfig> extends {
		user: {
			additionalFields: infer F extends Record<string, FieldConfig>;
		};
	}
		? InferAdditionalFields<F>
		: Record<never, never>);

export type InferSession<TConfig extends { auth?: unknown }> = BaseSession &
	OrgSessionFields<ExtractAuthOptions<TConfig>> &
	(ExtractAuthOptions<TConfig> extends {
		session: {
			additionalFields: infer F extends Record<string, FieldConfig>;
		};
	}
		? InferAdditionalFields<F>
		: Record<never, never>);
