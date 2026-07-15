import { defineConfig } from "vitest/config";

export default defineConfig({
	// `solid-js`'s package.json maps the "node" export condition to its SSR
	// build (`dist/server.js`), which throws outside a real hydrating render
	// (`getNextContextId cannot be used under non-hydrating context`).
	// Vitest runs under Node, so without this override any test that
	// exercises solid-js reactivity (createResource/useQuery-backed
	// primitives like `useAbility`) would resolve the wrong build. Forces
	// the client ("browser") build instead — the same fix solid+vitest
	// setups universally need.
	resolve: { conditions: ["browser"] },
	ssr: {
		resolve: { conditions: ["browser"] },
		noExternal: [/solid-js/, /@tanstack\/solid-query/],
	},
	test: { name: "plugin-solid-ui" },
});
