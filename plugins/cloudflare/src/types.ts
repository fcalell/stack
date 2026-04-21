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
