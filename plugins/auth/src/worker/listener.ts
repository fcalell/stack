import type { PasskeyOptions } from "@better-auth/passkey";

// The origin a request's listener serves, when the deploy target names one:
// the Node target's further listeners set `STACK_ORIGIN` on the env they
// hand the worker (from the server, never a request header), and Better Auth
// is built once per env, so one instance serves each origin. Elsewhere it is
// unset and the app's URL var stands.
export function listenerOrigin(env: Record<string, unknown>): string | null {
	const value = env.STACK_ORIGIN;
	return typeof value === "string" && value !== "" ? value : null;
}

// The base URL Better Auth is built with: the listener's origin, else the
// app's URL var. Better Auth trusts its base URL's origin and makes its
// cookies `Secure` (and `__Secure-` named) exactly when it is https, so both
// follow the listener.
export function appUrlOf(
	env: Record<string, unknown>,
	appUrlVar: string,
): string {
	return listenerOrigin(env) ?? (env[appUrlVar] as string);
}

export interface BakedPasskey {
	rpID: string;
	rpName: string;
	origin: string | string[];
	// The dev origins, swapped in with `rpID: "localhost"` under STACK_DEV.
	devOrigin?: string[];
	authenticatorSelection?: PasskeyOptions["authenticatorSelection"];
}

// The passkey options for one instance. Under STACK_DEV a localhost
// ceremony matches neither production value, so dev swaps in both. On a
// listener with an origin of its own, a ceremony runs at that origin: it
// joins the accepted origins, and when the baked relying party (the app's
// domain) is not that host or a parent of it, which no ceremony there could
// match, the host becomes the relying party.
export function passkeyFor(
	passkey: BakedPasskey,
	env: Record<string, unknown>,
	devMode: boolean,
): Omit<BakedPasskey, "devOrigin"> {
	const { devOrigin, ...production } = passkey;
	if (devOrigin && devMode) {
		return { ...production, rpID: "localhost", origin: devOrigin };
	}
	const own = listenerOrigin(env);
	if (own === null) return production;
	const host = new URL(own).hostname;
	const covered =
		host === production.rpID || host.endsWith(`.${production.rpID}`);
	const baked = Array.isArray(production.origin)
		? production.origin
		: [production.origin];
	return {
		...production,
		rpID: covered ? production.rpID : host,
		origin: [...new Set([...baked, own])],
	};
}
