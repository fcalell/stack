import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import {
	type AccessControl,
	createAccessControl,
	type Role,
	role,
} from "better-auth/plugins/access";
import {
	createAuthClient as createBetterAuthClient,
	type SolidAuthClient,
} from "better-auth/solid";

// The consumer's organization access control as codegen bakes it for the
// worker too: the statements of `ac` and each role's grants, plain records
// that a generated file can hold.
export interface OrganizationAccess {
	statements?: Record<string, readonly string[]>;
	roles?: Record<string, Record<string, readonly string[]>>;
}

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
	// methods. With the consumer's access control, its roles are the roles
	// the methods take (`inviteMember({ role })`); `true` keeps better-auth's
	// default owner, admin and member, as the worker does.
	organization?: boolean | OrganizationAccess;
}

// better-auth's client options for the access control, typed by it: the
// role names are the keys of `roles`.
type OrganizationClientAccess<A extends OrganizationAccess> = {
	ac: A["statements"] extends Record<string, readonly string[]>
		? AccessControl<A["statements"]>
		: undefined;
	roles: A["roles"] extends Record<string, unknown>
		? { [K in keyof A["roles"]]: Role }
		: undefined;
};

type ClientPlugins<O extends AuthClientOptions> = [
	...(O["passkey"] extends true ? [ReturnType<typeof passkeyClient>] : []),
	...(O["emailOtp"] extends false ? [] : [ReturnType<typeof emailOTPClient>]),
	// Instantiated with the options it is called with: the bare `ReturnType`
	// takes the options constraint, whose conditionals erase every
	// organization method from the client type.
	...(O["organization"] extends true
		? [ReturnType<typeof organizationClient<Record<never, never>>>]
		: O["organization"] extends infer A extends OrganizationAccess
			? [ReturnType<typeof organizationClient<OrganizationClientAccess<A>>>]
			: []),
];

// Named, not inferred: the inferred type reaches better-auth's own zod copy,
// which declaration emit cannot name from this package.
type BetterAuthClient<O extends AuthClientOptions> = SolidAuthClient<{
	baseURL: string | undefined;
	plugins: ClientPlugins<O>;
}>;

// Rebuilt through better-auth's own access control, as the worker rebuilds
// it: the client checks a role's permissions through `.authorize()`.
function organizationPlugin(access: true | OrganizationAccess) {
	if (access === true) return organizationClient();
	return organizationClient({
		...(access.statements
			? { ac: createAccessControl(access.statements) }
			: {}),
		...(access.roles
			? {
					roles: Object.fromEntries(
						Object.entries(access.roles).map(([name, grants]) => [
							name,
							role(grants),
						]),
					),
				}
			: {}),
	});
}

export function createAuthClient<const O extends AuthClientOptions>(
	options: O,
): BetterAuthClient<O> {
	const plugins = [
		...(options.passkey ? [passkeyClient()] : []),
		...(options.emailOtp === false ? [] : [emailOTPClient()]),
		...(options.organization ? [organizationPlugin(options.organization)] : []),
	] as ClientPlugins<O>;
	return createBetterAuthClient({ baseURL: options.baseURL, plugins });
}

export type AuthClient<O extends AuthClientOptions = AuthClientOptions> =
	ReturnType<typeof createAuthClient<O>>;
