import type { PluginConfig } from "@fcalell/config";

export interface ApiOptions {
	cors?: string | string[];
	prefix?: `/${string}`;
	domain?: string;
}

export function api(options?: ApiOptions): PluginConfig<"api", ApiOptions> {
	if (options?.prefix && !options.prefix.startsWith("/")) {
		throw new Error("api: prefix must start with /");
	}
	if (options?.cors !== undefined) {
		const cors = options.cors;
		if (
			typeof cors !== "string" &&
			(!Array.isArray(cors) || !cors.every((c) => typeof c === "string"))
		) {
			throw new Error("api: cors must be a string or array of strings");
		}
	}
	return {
		__plugin: "api",
		options: { prefix: "/rpc", ...options },
	};
}

export { ApiError } from "./error";
export type { Middleware } from "./procedure";
export type { InferRouter } from "./types";
