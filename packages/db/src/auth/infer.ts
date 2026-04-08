import type { AuthPolicy, FieldConfig } from "#kit/config";

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
		: {};

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

type ExtractAuthPolicy<TConfig> = TConfig extends {
	auth: { policy: infer P };
}
	? P
	: TConfig extends { auth: infer A extends AuthPolicy }
		? A
		: never;

type OrgSessionFields<TPolicy> = TPolicy extends { organization: infer O }
	? O extends false
		? {}
		: { activeOrganizationId: string | null }
	: {};

export type InferUser<TConfig extends { auth?: unknown }> = BaseUser &
	(ExtractAuthPolicy<TConfig> extends {
		user: {
			additionalFields: infer F extends Record<string, FieldConfig>;
		};
	}
		? InferAdditionalFields<F>
		: {});

export type InferSession<TConfig extends { auth?: unknown }> = BaseSession &
	OrgSessionFields<ExtractAuthPolicy<TConfig>> &
	(ExtractAuthPolicy<TConfig> extends {
		session: {
			additionalFields: infer F extends Record<string, FieldConfig>;
		};
	}
		? InferAdditionalFields<F>
		: {});
