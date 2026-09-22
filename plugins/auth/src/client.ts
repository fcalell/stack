import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient as createBetterAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

export interface AuthClientOptions {
	// Origin of the worker's `/api/auth`. Omitted, the client calls `/api/auth`
	// on the page's own origin.
	baseURL?: string;
	// Must match `auth({ passkey })`: adds the passkey sign-in and management
	// methods.
	passkey?: boolean;
	// Must match `auth({ emailOtp })`, on by default on both sides.
	emailOtp?: boolean;
}

type ClientPlugins<O extends AuthClientOptions> = [
	...(O["passkey"] extends true ? [ReturnType<typeof passkeyClient>] : []),
	...(O["emailOtp"] extends false ? [] : [ReturnType<typeof emailOTPClient>]),
];

// Named, not inferred: the inferred type reaches better-auth's own zod copy,
// which declaration emit cannot name from this package.
type BetterAuthClient<O extends AuthClientOptions> = ReturnType<
	typeof createBetterAuthClient<{
		baseURL: string | undefined;
		plugins: ClientPlugins<O>;
	}>
>;

export function createAuthClient<const O extends AuthClientOptions>(
	options: O,
): BetterAuthClient<O> {
	const plugins = [
		...(options.passkey ? [passkeyClient()] : []),
		...(options.emailOtp === false ? [] : [emailOTPClient()]),
	] as ClientPlugins<O>;
	return createBetterAuthClient({ baseURL: options.baseURL, plugins });
}

export type AuthClient<O extends AuthClientOptions = AuthClientOptions> =
	ReturnType<typeof createAuthClient<O>>;
