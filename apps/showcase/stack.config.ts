import { defineConfig } from "@fcalell/cli";
import { react } from "@fcalell/plugin-react";
import { reactUi } from "@fcalell/plugin-react-ui";
import { vite } from "@fcalell/plugin-vite";

export default defineConfig({
	app: { name: "showcase", domain: "showcase.localhost" },
	plugins: [
		vite(),
		react({ title: "Showcase", icon: "/favicon.svg" }),
		reactUi(),
	],
});
