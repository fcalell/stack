import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { react } from "@fcalell/plugin-react";
import { reactUi } from "@fcalell/plugin-react-ui";
import { screens } from "@fcalell/plugin-screens";
import { vite } from "@fcalell/plugin-vite";

export default defineConfig({
	app: { name: "showcase", domain: "showcase.localhost" },
	plugins: [
		vite(),
		react({ title: "Showcase", icon: "/favicon.svg" }),
		reactUi(),
		api(),
		screens(),
		cloudflare(),
	],
});
