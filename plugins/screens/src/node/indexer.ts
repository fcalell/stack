import { readFile } from "node:fs/promises";
import type { Indexer } from "storybook/internal/types";
import {
	routeIdOf,
	SCREEN_STATES,
	screenModuleId,
	screenTitle,
} from "./screens.ts";

// Turns each route file into its screens' stories. The stories are virtual: the
// module an entry imports is served by the Vite plugin from the route's id, so
// no story file exists and a route edit re-indexes through Storybook's own
// watcher on the route files.
export const routeIndexer: Indexer = {
	test: /\.tsx?$/,
	createIndex: async (fileName) => {
		const routeId = routeIdOf(await readFile(fileName, "utf8"));
		if (routeId === null) return [];
		return SCREEN_STATES.map(({ exportName, name }) => ({
			type: "story" as const,
			importPath: screenModuleId(routeId),
			exportName,
			name,
			title: screenTitle(routeId),
		}));
	},
};
