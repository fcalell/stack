import { allowScript, scriptHash } from "@fcalell/plugin-vite/csp";
import type { Plugin } from "vite";

// `@vitejs/plugin-react` puts React Refresh's preamble on the dev server's
// page as an inline script. A policy that restricts scripts blocks it, and
// every component module then throws "can't detect preamble", so the dev
// server's policy also allows the preamble by hash. `preambleCode` is the
// installed plugin's own (`react.preambleCode`, `__BASE__` standing for the
// config's `base`), so the hash follows an upgrade. A build serves no
// preamble and keeps the policy as it is.
export function refreshPolicyPlugin(preambleCode: string): Plugin {
	return {
		name: "fcalell:refresh-policy",
		apply: "serve",
		config(config) {
			const headers = config.server?.headers ?? {};
			const name = Object.keys(headers).find(
				(key) => key.toLowerCase() === "content-security-policy",
			);
			const policy = name === undefined ? undefined : headers[name];
			if (name === undefined || typeof policy !== "string") return;
			const preamble = preambleCode.replace("__BASE__", config.base ?? "/");
			return {
				server: {
					headers: { [name]: allowScript(policy, scriptHash(preamble)) },
				},
			};
		},
	};
}
