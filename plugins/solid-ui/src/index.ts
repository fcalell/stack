import { createPlugin } from "@fcalell/cli";
import { Init, Remove } from "@fcalell/cli/events";
import { solid } from "@fcalell/plugin-solid";
import type { SolidUiOptions } from "./types";

const LAYOUT_TEMPLATE = `import type { ParentProps } from "solid-js";
import { Toaster } from "@fcalell/ui/components/toast";

export default function Layout(props: ParentProps) {
\treturn (
\t\t<>
\t\t\t{props.children}
\t\t\t<Toaster />
\t\t</>
\t);
}
`;

const INDEX_TEMPLATE = `import { Text } from "@fcalell/ui/components/text";
import { Card } from "@fcalell/ui/components/card";

export default function Home() {
\treturn (
\t\t<Card>
\t\t\t<Card.Header>
\t\t\t\t<Card.Title>Welcome</Card.Title>
\t\t\t\t<Card.Description>Your app is ready.</Card.Description>
\t\t\t</Card.Header>
\t\t</Card>
\t);
}
`;

const ENTRY_OVERRIDE = `import "./app.css";
import { createApp } from "@fcalell/plugin-solid/app";

const app = createApp();
app.mount("#app");
`;

const ENTRY_CSS = `@import "tailwindcss";
@import "@fcalell/ui/globals.css";
`;

export const solidUi = createPlugin("solid-ui", {
	label: "Design System",
	depends: [solid.events.SolidConfigured],

	config(options: SolidUiOptions = {}) {
		return options;
	},

	register(_ctx, bus) {
		bus.on(Init.Scaffold, (p) => {
			// Override solid's bare templates with UI-rich versions.
			// Last writer wins — solid-ui depends on solid, so it registers
			// later and its templates take precedence.
			p.files.push({
				path: "src/app/entry.tsx",
				content: ENTRY_OVERRIDE,
			});
			p.files.push({
				path: "src/app/pages/_layout.tsx",
				content: LAYOUT_TEMPLATE,
			});
			p.files.push({
				path: "src/app/pages/index.tsx",
				content: INDEX_TEMPLATE,
			});
			p.files.push({ path: "src/app/app.css", content: ENTRY_CSS });
			p.dependencies["@fcalell/ui"] = "workspace:*";
		});

		bus.on(Remove, (p) => {
			p.dependencies.push("@fcalell/ui");
			// Don't delete src/app/ — plugin-solid owns that directory
		});
	},
});

export type { SolidUiOptions } from "./types";
