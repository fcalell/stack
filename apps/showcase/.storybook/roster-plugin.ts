import type { Plugin } from "vite";
import {
	CELLS_FILE,
	FRAMES_DIR,
	PAGES_FILE,
	UI_CORE_DIST,
	writeStories,
} from "./roster.ts";

// Rewrites the generated story modules when the roster, its cells, the page
// list or a frame drawer change; Storybook re-indexes the modules that changed.
export function rosterPlugin(): Plugin {
	return {
		name: "stack:roster-stories",
		configureServer(server) {
			const watched = [CELLS_FILE, PAGES_FILE, FRAMES_DIR, UI_CORE_DIST];
			server.watcher.add(watched);
			let timer: ReturnType<typeof setTimeout> | undefined;
			const regenerate = (file: string) => {
				if (!watched.some((dir) => file.startsWith(dir))) return;
				clearTimeout(timer);
				timer = setTimeout(writeStories, 200);
			};
			for (const event of ["add", "change", "unlink"] as const)
				server.watcher.on(event, regenerate);
		},
	};
}
