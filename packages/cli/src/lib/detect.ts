import { existsSync } from "node:fs";
import { join } from "node:path";

export interface ProjectState {
	hasConfig: boolean;
	hasApi: boolean;
	hasApp: boolean;
}

export function detect(cwd = process.cwd()): ProjectState {
	return {
		hasConfig: existsSync(join(cwd, "stack.config.ts")),
		hasApi: existsSync(join(cwd, "src", "worker", "index.ts")),
		hasApp: existsSync(join(cwd, "src", "app", "entry.tsx")),
	};
}
