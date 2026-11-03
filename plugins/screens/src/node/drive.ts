import { readFileSync } from "node:fs";
import { withLease } from "./browser.ts";
import { sleep } from "./chrome.ts";
import { Page, printRun, target } from "./shoot.ts";

// `stack screens drive <plan.json> --url <app>`: a plan is a list of steps run
// in a tab of the app, once for each viewport of `each`.

export type Step =
	| { goto: string }
	| { open: string }
	| { key: string }
	| { type: string }
	| { fx: string }
	| { shot: string }
	| { offline: boolean }
	| { scroll: number; in?: string };

export interface Plan {
	each: { width: number; mode: string }[];
	steps: Step[];
}

const KINDS: Record<string, "string" | "boolean" | "number"> = {
	goto: "string",
	open: "string",
	key: "string",
	type: "string",
	fx: "string",
	shot: "string",
	offline: "boolean",
	scroll: "number",
};

// Parses a plan. A step of a kind this list does not name, with a value of
// the wrong type, or with two kinds in one object, fails the whole plan before
// anything runs.
export function parsePlan(text: string): Plan {
	const plan = JSON.parse(text) as {
		each?: { width?: unknown; mode?: unknown }[];
		steps?: unknown;
	};
	if (!Array.isArray(plan.steps) || plan.steps.length === 0)
		throw new Error('the plan has no steps: expected { "steps": [...] }');
	const steps = plan.steps.map((raw, index): Step => {
		const at = `step ${index + 1} ${JSON.stringify(raw)}`;
		if (typeof raw !== "object" || raw === null || Array.isArray(raw))
			throw new Error(`${at} is not an object`);
		const keys = Object.keys(raw).filter(
			(key) => !(key === "in" && "scroll" in raw),
		);
		const [kind] = keys;
		if (keys.length !== 1 || !kind || !(kind in KINDS))
			throw new Error(
				`${at}: a step has exactly one of ${Object.keys(KINDS).join(", ")}`,
			);
		if (typeof (raw as Record<string, unknown>)[kind] !== KINDS[kind])
			throw new Error(`${at}: ${kind} takes a ${KINDS[kind]}`);
		if ("in" in raw && typeof raw.in !== "string")
			throw new Error(`${at}: in takes a CSS selector`);
		return raw as Step;
	});
	const each = (plan.each ?? [{ width: 320 }, { width: 1920 }]).map((entry) => {
		const width = entry.width;
		if (typeof width !== "number" || !Number.isInteger(width) || width < 200)
			throw new Error(`each: ${JSON.stringify(entry)} needs a width in px`);
		const mode = entry.mode ?? "dark";
		if (mode !== "light" && mode !== "dark")
			throw new Error(`each: mode is light or dark, not ${String(mode)}`);
		return { width, mode };
	});
	return { each, steps };
}

// `{{fx}}` in a step's text is the last `fx` step's answer.
export const fill = (text: string, fx: string): string =>
	text.replaceAll("{{fx}}", fx);

async function run(page: Page, steps: Step[]): Promise<void> {
	let fx = "";
	for (const [index, step] of steps.entries()) {
		const at = `step ${index + 1} ${JSON.stringify(step)}`;
		try {
			if ("goto" in step) await page.goto(fill(step.goto, fx));
			else if ("open" in step) await page.open(fill(step.open, fx));
			else if ("key" in step) {
				await page.tab.key(step.key);
				await sleep(150);
			} else if ("type" in step) {
				await page.tab.type(fill(step.type, fx));
				await sleep(150);
			} else if ("fx" in step) {
				const path = JSON.stringify(
					new URL(fill(step.fx, fx), page.target.url).href,
				);
				fx = await page.tab.evaluate<string>(
					`fetch(${path}, { credentials: "include" }).then((r) => r.text())`,
				);
			} else if ("shot" in step) await page.shoot(step.shot);
			else if ("offline" in step) await page.tab.offline(step.offline);
			else {
				const scroller = step.in
					? `document.querySelector(${JSON.stringify(step.in)})`
					: "document.scrollingElement";
				await page.tab.evaluate(`${scroller}.scrollTop = ${step.scroll}`);
				await sleep(150);
			}
		} catch (error) {
			throw new Error(`${at}: ${(error as Error).message}`);
		}
	}
}

export async function drive(
	file: string,
	flags: Record<string, unknown>,
	cwd: string,
): Promise<void> {
	const plan = parsePlan(readFileSync(file, "utf8"));
	const app = target(flags, cwd);
	const pages: Page[] = [];
	await withLease(async (lease) => {
		const scope = await lease.context();
		const signedIn = { done: false };
		for (const { width, mode } of plan.each) {
			const page = await Page.open(scope, app, width, mode, signedIn);
			pages.push(page);
			try {
				await run(page, plan.steps);
			} catch (error) {
				page.report((error as Error).message);
			} finally {
				await page.tab.close();
			}
		}
	});
	printRun("stack screens drive", pages);
}
