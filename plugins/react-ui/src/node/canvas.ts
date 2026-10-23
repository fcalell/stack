import type { Plugin } from "vite";

// Vite's dev optimizer pre-bundles this package's `.tsx`, and a `?worker`
// import cannot survive pre-bundling. The module holding it is served as
// source, and its CJS dependency is pre-bundled by name.
export function canvasPlugin(): Plugin {
	return {
		name: "fcalell:canvas",
		config: () => ({
			optimizeDeps: {
				exclude: ["@fcalell/plugin-react-ui/lib/canvas-layout"],
				include: ["@fcalell/plugin-react-ui > elkjs/lib/elk-api.js"],
			},
		}),
	};
}
