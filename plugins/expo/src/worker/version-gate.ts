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

// A stranded user must still be able to re-auth after updating, so the auth
// surface is never walled, even though it is one of the worker's own route
// prefixes.
const AUTH_PREFIX = "/api/auth";

// Exact match or a real sub-path (`/rpc/trips.list`), not a mere prefix
// look-alike like `/rpcX`, which `startsWith("/rpc")` would wrongly match.
function isWithin(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isGatedPath(pathname: string, prefixes: string[]): boolean {
	if (isWithin(pathname, AUTH_PREFIX)) return false;
	return prefixes.some((prefix) => isWithin(pathname, prefix));
}

export interface VersionGateOptions {
	ios: number;
	android: number;
	// The worker's own route prefixes (`api.slots.routePrefixes`). Only paths
	// inside one are walled: a consumer's raw route is its own surface, and a
	// stale client hitting it must not newly get a 426 it never asked for.
	// Liveness (`/`) falls outside every prefix and so is never gated.
	prefixes: string[];
	// Env binding name of an Analytics Engine dataset (WS6.2). When the
	// binding is live, the gate counts walled and fail-open (header-less /
	// malformed) requests — the canary that measures how many clients the
	// gate cannot wall. Absent binding = no telemetry, never an error.
	metricsBinding?: string;
}

// Structural slice of Cloudflare's AnalyticsEngineDataset — the worker types
// aren't a dependency here, and only writeDataPoint is used.
interface MetricsDataset {
	writeDataPoint(point: {
		blobs?: string[];
		doubles?: number[];
		indexes?: string[];
	}): void;
}

function writeMetric(
	env: unknown,
	binding: string | undefined,
	event: "walled" | "headerless",
	platform: string | undefined,
	build: string | undefined,
): void {
	if (!binding) return;
	const dataset = (env as Record<string, unknown> | null | undefined)?.[
		binding
	] as MetricsDataset | undefined;
	if (typeof dataset?.writeDataPoint !== "function") return;
	try {
		dataset.writeDataPoint({
			blobs: [event, platform ?? "", build ?? ""],
			indexes: [event],
		});
	} catch {
		// Telemetry must never take down the request path.
	}
}

// Hono middleware factory: walls a native client below `options[platform]`
// with 426 Upgrade Required. The wall is a UX nudge, not a security control —
// anything that can't be confidently read as "this is a stale native client"
// (missing header, non-integer build, unknown platform) fails open, same as
// an ungated path.
export function versionGate(options: VersionGateOptions): MiddlewareHandler {
	return async (c, next) => {
		if (!isGatedPath(c.req.path, options.prefixes)) return next();

		const build = c.req.header(CLIENT_BUILD_HEADER);
		const platform = c.req.header(CLIENT_PLATFORM_HEADER);
		if (!build || !platform || !BUILD_NUMBER_RE.test(build)) {
			writeMetric(c.env, options.metricsBinding, "headerless", platform, build);
			return next();
		}

		const floor =
			platform === "ios"
				? options.ios
				: platform === "android"
					? options.android
					: null;
		if (floor === null) {
			writeMetric(c.env, options.metricsBinding, "headerless", platform, build);
			return next();
		}

		if (Number(build) < floor) {
			writeMetric(c.env, options.metricsBinding, "walled", platform, build);
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
