import type { MiddlewareHandler } from "hono";
import {
	CLIENT_BUILD_HEADER,
	CLIENT_PLATFORM_HEADER,
} from "../version-gate-shared";

// Wire contract for the client version gate (WS4). `@fcalell/plugin-expo/client`
// stamps these headers on every request
// from `expo-application` (build number) + `Platform.OS`; this module reads
// them to decide whether to wall the request. Re-exported here so existing
// importers of `@fcalell/plugin-expo/version-gate` see no change.
export { CLIENT_BUILD_HEADER, CLIENT_PLATFORM_HEADER };

// EAS build numbers are integers. `Number("")` is 0 and `parseInt("1.2.3")`
// is 1 — both would mis-gate a malformed/absent header — so the whole string
// must be digits before it's trusted.
const BUILD_NUMBER_RE = /^\d+$/;

// A stranded user must still be able to re-auth after updating, and
// liveness must never depend on a client identifying itself.
const AUTH_PREFIX = "/api/auth";

function isUngatedPath(pathname: string): boolean {
	if (pathname === "/") return true;
	// Exact match or a real sub-path (`/api/auth/get-session`) — NOT a mere
	// prefix look-alike like `/api/authX`, which `startsWith("/api/auth")`
	// would wrongly exempt.
	return pathname === AUTH_PREFIX || pathname.startsWith(`${AUTH_PREFIX}/`);
}

export interface VersionGateOptions {
	ios: number;
	android: number;
}

// Hono middleware factory: walls a native client below `options[platform]`
// with 426 Upgrade Required. The wall is a UX nudge, not a security control —
// anything that can't be confidently read as "this is a stale native client"
// (missing header, non-integer build, unknown platform) fails open, same as
// an ungated path.
export function versionGate(options: VersionGateOptions): MiddlewareHandler {
	return async (c, next) => {
		if (isUngatedPath(c.req.path)) return next();

		const build = c.req.header(CLIENT_BUILD_HEADER);
		const platform = c.req.header(CLIENT_PLATFORM_HEADER);
		if (!build || !platform || !BUILD_NUMBER_RE.test(build)) return next();

		const floor =
			platform === "ios"
				? options.ios
				: platform === "android"
					? options.android
					: null;
		if (floor === null) return next();

		if (Number(build) < floor) {
			return c.json(
				{
					code: "UPGRADE_REQUIRED",
					message: "A newer version of the app is required.",
				},
				426,
			);
		}

		return next();
	};
}
