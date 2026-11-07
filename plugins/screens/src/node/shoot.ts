import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { HEIGHT, SHOT_MAX_HEIGHT } from "../widths.ts";
import { withLease } from "./browser.ts";
import { call, controlPoint, judge, prepare, settle } from "./judge.ts";
import { parseList } from "./select.ts";
import type { Tab } from "./tab.ts";

// `stack screens shoot` and `drive`: a live app opened in the shared browser,
// judged and shot at each width and mode. `shoot` visits routes; `drive` runs a
// plan (`drive.ts`) over the same `Page`.

export interface Target {
	// The app's origin and any path it is served under.
	url: string;
	cwd: string;
	// Where the PNGs go, absolute.
	dir: string;
	// A shot grows the page to all it holds, not the viewport.
	full: boolean;
	// The most a page may take to go quiet, in ms.
	settle: number;
	cookie?: string;
	signIn?: string;
}

export const slug = (text: string): string =>
	text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.join("-");

// A route's name in a file: `/` is `index`, `/deploys/abc?x=1` is
// `deploys-abc-x-1`.
export const routeSlug = (route: string): string => slug(route) || "index";

export const shotName = (
	name: string,
	width: number,
	mode: string,
	opened?: string,
): string =>
	`${name}-${width}-${mode}${opened ? `-open-${slug(opened)}` : ""}.png`;

export function parseWidthList(value: unknown, fallback: number[]): number[] {
	const items = parseList(value);
	if (items.length === 0) return fallback;
	return items.map((item) => {
		const width = Number(item);
		if (!Number.isInteger(width) || width < 200 || width > 4000)
			throw new Error(`--width: ${item} is not a width in px (200 to 4000)`);
		return width;
	});
}

export function parseModes(value: unknown): string[] {
	const modes = parseList(value);
	const bad = modes.filter((mode) => mode !== "light" && mode !== "dark");
	if (bad.length > 0)
		throw new Error(`--mode: ${bad.join(", ")} is not light or dark`);
	return modes.length === 0 ? ["dark"] : modes;
}

export function parseCookie(
	value: unknown,
): { name: string; value: string } | undefined {
	if (value === undefined) return undefined;
	const text = String(value);
	const at = text.indexOf("=");
	if (at < 1) throw new Error("--cookie: give name=value");
	return { name: text.slice(0, at), value: text.slice(at + 1) };
}

export function parseSettle(value: unknown): number {
	if (value === undefined) return 10_000;
	const ms = Number(value);
	if (!Number.isFinite(ms) || ms < 0)
		throw new Error("--settle: give milliseconds");
	return ms;
}

export function parseApp(value: unknown): string {
	if (typeof value !== "string" || value === "")
		throw new Error(
			"--url: give the app's address, like http://localhost:3000",
		);
	return new URL(value).href;
}

export function target(flags: Record<string, unknown>, cwd: string): Target {
	return {
		url: parseApp(flags.url),
		cwd,
		dir: resolve(
			cwd,
			typeof flags.shots === "string" ? flags.shots : ".stack/shots",
		),
		full: flags.full === true,
		settle: parseSettle(flags.settle),
		cookie: flags.cookie as string | undefined,
		signIn: flags["sign-in"] as string | undefined,
	};
}

// A tab of the app at one width and mode, with the page code in it, the
// cookie set, and the sign-in link, if any, followed.
export class Page {
	findings: string[] = [];
	// What the run says and does not fail on: a page still busy at the cap.
	notes: string[] = [];
	shots: string[] = [];

	readonly tab: Tab;
	readonly target: Target;
	readonly width: number;
	readonly mode: string;

	private constructor(tab: Tab, target: Target, width: number, mode: string) {
		this.tab = tab;
		this.target = target;
		this.width = width;
		this.mode = mode;
	}

	static async open(
		scope: { tab(): Promise<Tab> },
		target: Target,
		width: number,
		mode: string,
		signedIn: { done: boolean },
	): Promise<Page> {
		const tab = await scope.tab();
		await tab.media(mode);
		await tab.viewport(width, HEIGHT);
		await prepare(tab, target.cwd);
		const cookie = parseCookie(target.cookie);
		if (cookie) await tab.cookie(cookie.name, cookie.value, target.url);
		if (target.signIn && !signedIn.done) {
			signedIn.done = true;
			await tab.goto(new URL(target.signIn, target.url).href);
			await settle(tab, target.settle);
		}
		return new Page(tab, target, width, mode);
	}

	async goto(path: string): Promise<void> {
		await this.tab.goto(new URL(path, this.target.url).href);
		await this.quiet();
	}

	async quiet(): Promise<void> {
		const busy = await settle(this.tab, this.target.settle);
		if (busy)
			this.notes.push(`${this.label}: settle: ${busy}, shot as it stood`);
	}

	report(line: string): void {
		this.findings.push(`${this.label}: ${line}`);
	}

	get label(): string {
		return `${this.width}px ${this.mode}`;
	}

	// Presses the control named `text`, then waits for the page to go quiet.
	async open(text: string): Promise<void> {
		await this.tab.press(await controlPoint(this.tab, text), text);
		await this.quiet();
	}

	// Judges the page as it is and writes its shot, the viewport or with
	// `--full` all the page holds.
	async shoot(name: string, opened?: string, fonts = true): Promise<void> {
		const found = await judge(this.tab, this.target.cwd, this.width, fonts);
		for (const line of found)
			this.report(opened ? `with "${opened}" open: ${line}` : line);
		let height = HEIGHT;
		if (this.target.full) {
			for (
				let hidden = await call<number>(this.tab, "hiddenHeight()");
				hidden > 0 && height < SHOT_MAX_HEIGHT;
				hidden = await call<number>(this.tab, "hiddenHeight()")
			) {
				height = Math.min(height + hidden, SHOT_MAX_HEIGHT);
				await this.tab.viewport(this.width, height);
				await this.quiet();
			}
		}
		const file = join(
			this.target.dir,
			shotName(name, this.width, this.mode, opened),
		);
		await mkdir(dirname(file), { recursive: true });
		await writeFile(file, await this.tab.screenshot());
		this.shots.push(file);
		if (height !== HEIGHT) await this.tab.viewport(this.width, HEIGHT);
	}
}

export function printRun(label: string, pages: Page[]): void {
	const shots = pages.flatMap((page) => page.shots);
	const findings = pages.flatMap((page) => page.findings);
	const notes = pages.flatMap((page) => page.notes);
	console.log(
		[`${label}: ${shots.length} shots`, ...shots, ...notes].join("\n"),
	);
	if (findings.length > 0) {
		console.log(findings.join("\n"));
		throw new Error(`${label}: ${findings.length} findings`);
	}
}

export async function shoot(
	flags: Record<string, unknown>,
	cwd: string,
): Promise<void> {
	const app = target(flags, cwd);
	const routes = parseList(flags.route);
	if (routes.length === 0)
		throw new Error("--route: give the routes to shoot, like /,/deploys");
	const widths = parseWidthList(flags.width, [320, 1920]);
	const modes = parseModes(flags.mode);
	const open = typeof flags.open === "string" ? flags.open : undefined;
	const pages: Page[] = [];
	await withLease(async (lease) => {
		const scope = await lease.context();
		const signedIn = { done: false };
		for (const mode of modes) {
			for (const width of widths) {
				const page = await Page.open(scope, app, width, mode, signedIn);
				pages.push(page);
				try {
					for (const route of routes) {
						await page.goto(route);
						await page.shoot(routeSlug(route));
						if (open) {
							try {
								await page.open(open);
							} catch (error) {
								page.report(`--open on ${route}: ${(error as Error).message}`);
								continue;
							}
							await page.shoot(routeSlug(route), open, false);
						}
					}
				} catch (error) {
					page.report((error as Error).message);
				} finally {
					await page.tab.close();
				}
			}
		}
	});
	printRun("stack screens shoot", pages);
}
