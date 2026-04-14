import { join } from "node:path";
import { detect } from "#lib/detect";
import { announceCreated, scaffoldFiles } from "#lib/scaffold";
import { apiClientTemplate } from "#templates/api-client";
import { appTemplate } from "#templates/app";
import { cssTemplate } from "#templates/css";
import { entryTemplate } from "#templates/entry";

export async function add(): Promise<void> {
	const state = detect();

	const entries: Array<[string, string]> = [
		[join("src", "app", "entry.tsx"), entryTemplate({ api: state.hasApi })],
		[join("src", "app", "app.tsx"), appTemplate()],
		[join("src", "app", "app.css"), cssTemplate()],
	];

	if (state.hasApi) {
		entries.push([join("src", "app", "lib", "api.ts"), apiClientTemplate()]);
	}

	announceCreated(scaffoldFiles(entries));
}
