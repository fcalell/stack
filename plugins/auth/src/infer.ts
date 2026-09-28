// The user as the session carries it: better-auth's base user, the same for
// every configuration.
export type SessionUser = {
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

export type InferSession<TConfig extends { auth?: unknown }> = BaseSession &
	OrgSessionFields<ExtractAuthOptions<TConfig>>;
