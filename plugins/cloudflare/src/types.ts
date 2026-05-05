import { z } from "zod";

export const cloudflareOptionsSchema = z.object({}).optional();

export type CloudflareOptions = z.input<typeof cloudflareOptionsSchema>;

export type WranglerBindingSpec =
	| {
			kind: "d1";
			binding: string;
			databaseName: string;
			databaseId: string;
			migrationsDir?: string;
	  }
	| { kind: "kv"; binding: string; id: string }
	| { kind: "r2"; binding: string; bucketName: string }
	| {
			kind: "rate_limiter";
			binding: string;
			simple: { limit: number; period: number };
	  }
	| { kind: "var"; name: string; value: string };

export type WranglerRouteSpec = {
	pattern: string;
	zone?: string;
	customDomain?: boolean;
};

export interface CodegenWranglerPayload {
	bindings: WranglerBindingSpec[];
	routes: WranglerRouteSpec[];
	vars: Record<string, string>;
	secrets: Array<{ name: string; devDefault: string }>;
	compatibilityDate: string;
}

// Default Workers compatibility date. Pinned so wrangler.toml generation is
// deterministic from (config + plugin version) — not from today's wall clock.
// Bump alongside plugin releases; consumers who want a newer date push a
// `cloudflare.slots.compatibilityDate` value with `override: true`.
//
// Why pin in source (not a build step): the alternative is reading the wall
// clock at generate-time, which makes wrangler.toml content depend on which
// day `stack generate` runs. That breaks snapshot tests across midnight, dirty
// `wrangler types` regeneration caches, and thrashes CI build caches for no
// functional reason. A repo-versioned constant trades "automatic bumps" for
// bit-exact reproducibility, which is the more important property in practice
// — compat dates are a stability contract, not a feature flag.
export const DEFAULT_COMPATIBILITY_DATE = "2025-01-01";
