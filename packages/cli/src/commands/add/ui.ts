import { join } from "node:path";
import { detect } from "#lib/detect";
import { announceCreated, scaffoldFiles } from "#lib/scaffold";
import { apiClientTemplate } from "#templates/api-client";
import { cssTemplate } from "#templates/css";
import { entryTemplate } from "#templates/entry";
import { pagesIndexTemplate, pagesLayoutTemplate } from "#templates/pages";
import { viteTemplate } from "#templates/vite";

export async function add(): Promise<void> {
	const state = detect();

	const entries: Array<[string, string]> = [
		["vite.config.ts", viteTemplate()],
		[join("src", "app", "entry.tsx"), entryTemplate()],
		[join("src", "app", "app.css"), cssTemplate()],
		[join("src", "app", "pages", "_layout.tsx"), pagesLayoutTemplate()],
		[join("src", "app", "pages", "index.tsx"), pagesIndexTemplate()],
	];

	if (state.hasApi) {
		entries.push([join("src", "app", "lib", "api.ts"), apiClientTemplate()]);
	}

	announceCreated(scaffoldFiles(entries));
}
