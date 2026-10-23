import type { PluginConfig } from "@fcalell/cli";

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
	// Set only on a call an agent makes through an OAuth grant at `/mcp`.
	agent?: true;
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

type OrgSessionFields<TOptions> = TOptions extends { organization: infer O }
	? O extends undefined | false
		? Record<never, never>
		: { activeOrganizationId: string | null }
	: Record<never, never>;

// The session for auth configured with `TOptions` as written, so
// `organization: true` is the literal, not the resolved options' union.
export type SessionOf<TOptions> = BaseSession & OrgSessionFields<TOptions>;

// The session for a `defineConfig` result: the auth entry's literal input.
export type InferSession<TConfig extends { plugins: readonly PluginConfig[] }> =
	Extract<
		TConfig["plugins"][number],
		PluginConfig<"auth">
	> extends PluginConfig<"auth", unknown, infer TInput>
		? SessionOf<TInput>
		: never;
