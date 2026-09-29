import { DURATIONS } from "@fcalell/ui-core/tokens";
import { test } from "@playwright/test";
import { cellSelector, componentGate } from "./lib/showcase.ts";

test.describe("motion", () => {
	// No transition names `all`, every duration is a contract rung, and under
	// reduced motion every duration is zero.
	for (const reducedMotion of ["no-preference", "reduce"] as const) {
		test.describe(`reduced motion ${reducedMotion}`, () => {
			test.use({ contextOptions: { reducedMotion } });
			componentGate(
				async (page, frames) => {
					// Each rung resolved by the browser: a rung no component uses is not
					// emitted and reads as 0.
					const rungs = await page.evaluate(
						(names) => {
							const probe = document.createElement("div");
							document.body.append(probe);
							const resolved = names.map((name) => {
								probe.style.transitionDuration = `var(--transition-duration-${name})`;
								return (
									Number.parseFloat(
										getComputedStyle(probe).transitionDuration,
									) * 1000
								);
							});
							probe.remove();
							return resolved.filter((ms) => ms > 0);
						},
						[...DURATIONS],
					);
					const findings: string[] = [];
					for (const frame of frames) {
						const timings = await page
							.locator(cellSelector(frame.id))
							.evaluate((root) =>
								[root, ...root.querySelectorAll("*")].flatMap((element) =>
									[null, "::before", "::after"].map((pseudo) => {
										const style = getComputedStyle(element, pseudo);
										const ms = (value: string) =>
											value
												.split(",")
												.map((part) => Number.parseFloat(part) * 1000);
										return {
											name: `${element.tagName.toLowerCase()}${pseudo ?? ""}`,
											properties: style.transitionProperty
												.split(",")
												.map((part) => part.trim()),
											transitions: ms(style.transitionDuration),
											animations:
												style.animationName === "none"
													? []
													: ms(style.animationDuration),
										};
									}),
								),
							);
						for (const timing of timings) {
							const at = `${frame.id}: ${timing.name}`;
							timing.properties.forEach((property, i) => {
								const duration =
									timing.transitions[i % timing.transitions.length] ?? 0;
								if (property === "all" && duration > 0) {
									findings.push(`${at} transitions all`);
								}
							});
							for (const duration of [
								...timing.transitions,
								...timing.animations,
							]) {
								if (duration === 0) continue;
								if (reducedMotion === "reduce") {
									findings.push(
										`${at} moves ${duration} ms under reduced motion`,
									);
								} else if (
									!rungs.some((rung) => Math.abs(rung - duration) < 0.5)
								) {
									findings.push(
										`${at} ${duration} ms is not a rung (${rungs.join(", ")})`,
									);
								}
							}
						}
					}
					return findings;
				},
				{ freeze: false },
			);
		});
	}
});
