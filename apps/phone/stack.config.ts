import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { expo } from "@fcalell/plugin-expo";
import { nativeUi } from "@fcalell/plugin-native-ui";

export default defineConfig({
	app: {
		name: "phone",
		domain: "example.com",
	},
	plugins: [
		expo(),
		api(),
		db({
			dialect: "d1",
			databaseId: "YOUR_D1_DATABASE_ID",
		}),
		auth({
			cookies: {
				prefix: "phone",
			},
			organization: false,
		}),
		nativeUi(),
		cloudflare(),
	],
});
