import { join } from "node:path";
import {
	announceCreated,
	ensureGitignore,
	patchPackageJson,
	scaffoldFiles,
} from "#lib/scaffold";
import { pagesIndexTemplate, pagesLayoutTemplate } from "#templates/pages";

export async function add(): Promise<void> {
	const cwd = process.cwd();

	const entries: Array<[string, string]> = [
		[join("src", "app", "pages", "_layout.tsx"), pagesLayoutTemplate()],
		[join("src", "app", "pages", "index.tsx"), pagesIndexTemplate()],
	];
	announceCreated(scaffoldFiles(entries));

	ensureGitignore(".stack");
	patchPackageJson(cwd, {
		imports: { "#/*": "./src/*" },
		dependencies: {
			"@fcalell/ui": "workspace:*",
			"@fcalell/vite": "workspace:*",
			"solid-js": "^1.9.0",
		},
		scripts: {
			"dev:app": "stack-vite dev",
			build: "stack-vite build",
			preview: "stack-vite preview",
		},
	});
}
