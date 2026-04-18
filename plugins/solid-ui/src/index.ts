import { createPlugin } from "@fcalell/cli";
import { Codegen, Composition, Init, Remove } from "@fcalell/cli/events";
import { solid } from "@fcalell/plugin-solid";
import type { SolidUiOptions } from "./types";

export const solidUi = createPlugin("solid-ui", {
	label: "Design System",
	depends: [solid.events.SolidConfigured],

	config(options: SolidUiOptions = {}) {
		return options;
	},

	register(_ctx, bus) {
		bus.on(Init.Scaffold, (p) => {
			p.files.push({
				source: new URL("../templates/home.tsx", import.meta.url),
				target: "src/app/pages/index.tsx",
			});
			p.dependencies["@fcalell/ui"] = "workspace:*";
		});

		bus.on(Codegen.AppCss, (p) => {
			p.imports.push("@fcalell/ui/globals.css");
		});

		// MetaProvider wraps the app so <Title> / <Meta> from any page can
		// contribute to <head>. Toaster renders as a sibling alongside the
		// wrapped children so solid-sonner anchors at the root.
		bus.on(Composition.Providers, (p) => {
			p.providers.push({
				imports: [
					{ source: "@fcalell/ui/meta", named: ["MetaProvider"] },
					{ source: "@fcalell/ui/components/toast", named: ["Toaster"] },
				],
				wrap: { identifier: "MetaProvider" },
				siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
				order: 100,
			});
		});

		bus.on(Remove, (p) => {
			p.dependencies.push("@fcalell/ui");
			// Don't delete src/app/ — plugin-solid owns that directory
		});
	},
});

export type { SolidUiOptions } from "./types";
