import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import {
	createAuthClient as createBetterAuthClient,
	type SolidAuthClient,
} from "better-auth/solid";

// The web client: better-auth's Solid client, so `useSession()` is an
// accessor. solid-ui generates the call in `.stack/auth-client.ts` from the
// `auth` options, so every flag matches the server's.
export interface AuthClientOptions {
	// Origin of the worker's `/api/auth`. Omitted, the client calls `/api/auth`
	// on the page's own origin.
	baseURL?: string;
	// `auth({ passkey })`: adds the passkey sign-in and management methods.
	passkey?: boolean;
	// `auth({ emailOtp })`, on by default on both sides.
	emailOtp?: boolean;
	// `auth({ organization })`: adds the organization, member and invitation
	// methods.
	organization?: boolean;
}

type ClientPlugins<O extends AuthClientOptions> = [
	...(O["passkey"] extends true ? [ReturnType<typeof passkeyClient>] : []),
	...(O["emailOtp"] extends false ? [] : [ReturnType<typeof emailOTPClient>]),
	// Instantiated with no options, as it is called: the bare `ReturnType`
	// takes the options constraint, whose conditionals erase every
	// organization method from the client type.
	...(O["organization"] extends true
		? [ReturnType<typeof organizationClient<Record<never, never>>>]
		: []),
];

// Named, not inferred: the inferred type reaches better-auth's own zod copy,
// which declaration emit cannot name from this package.
type BetterAuthClient<O extends AuthClientOptions> = SolidAuthClient<{
	baseURL: string | undefined;
	plugins: ClientPlugins<O>;
}>;

export function createAuthClient<const O extends AuthClientOptions>(
	options: O,
): BetterAuthClient<O> {
	const plugins = [
		...(options.passkey ? [passkeyClient()] : []),
		...(options.emailOtp === false ? [] : [emailOTPClient()]),
		...(options.organization ? [organizationClient()] : []),
	] as ClientPlugins<O>;
	return createBetterAuthClient({ baseURL: options.baseURL, plugins });
}

export type AuthClient<O extends AuthClientOptions = AuthClientOptions> =
	ReturnType<typeof createAuthClient<O>>;
