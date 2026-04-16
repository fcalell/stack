import { existsSync } from "node:fs";
import { join } from "node:path";

export interface ProjectState {
	hasConfig: boolean;
	hasWorker: boolean;
	hasApp: boolean;
}

export function detect(cwd = process.cwd()): ProjectState {
	return {
		hasConfig: existsSync(join(cwd, "stack.config.ts")),
		hasWorker: existsSync(join(cwd, "src", "worker")),
		hasApp: existsSync(join(cwd, "src", "app", "pages")),
	};
}
