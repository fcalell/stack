import { expect, test } from "@playwright/test";
import { open, VIEWS } from "./lib/showcase.ts";

test.describe("console", () => {
	// No error or warning on any page, a failed request included.
	for (const view of VIEWS) {
		test(view.url, async ({ page }) => {
			const messages: string[] = [];
			page.on("console", (message) => {
				if (message.type() === "error" || message.type() === "warning") {
					messages.push(`${message.type()}: ${message.text()}`);
				}
			});
			page.on("pageerror", (error) =>
				messages.push(`pageerror: ${error.message}`),
			);
			page.on("response", (response) => {
				if (response.status() >= 400) {
					messages.push(`${response.status()}: ${response.url()}`);
				}
			});
			await open(page, view);
			await page.waitForLoadState("networkidle");
			expect(messages).toEqual([]);
		});
	}
});
