import { readFileSync } from "node:fs";

// The guide pages the UI plugins index for this package. Node-only: the name is
// read from the package's own package.json, one level above `src/` and `dist/`.
const { name } = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { name: string };

export const uiCoreGuide = [
	{
		page: "screen",
		trigger: "Building or redesigning a screen, page or route",
	},
	{
		page: "voice",
		trigger:
			"Deciding or judging how anything looks: the anchor, the decisions, the floors",
	},
	{
		page: "structure",
		trigger:
			"Building or editing a ui component: its layout, props, contexts and class strings",
	},
].map((p) => ({ domain: "ui-core", package: name, ...p }));
