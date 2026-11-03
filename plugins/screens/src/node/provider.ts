import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
	assertBrowserApiWrite,
	assertBrowserFileAccess,
	defineBrowserProvider,
	resolveScreenshotPath,
} from "@vitest/browser";
import type { BrowserCommands } from "vitest/internal/browser";
import type {
	BrowserCommand,
	BrowserProvider,
	BrowserProviderOption,
	TestProject,
} from "vitest/node";
import { type Lease, openLease, type Scope } from "./browser.ts";
import type { Tab } from "./tab.ts";

// Vitest's browser provider over the shared Chrome (`browser.ts`): one browser
// context per session, a tab in it, reduced
// motion and a device scale of 1. The run draws and judges the page itself, so
// the commands it needs are the viewport, a screenshot, and the two inputs
// `--open` uses.

declare module "vitest/node" {
	interface BrowserCommandContext {
		tab: Tab;
	}
}

const viewport: BrowserCommand<[{ width: number; height: number }]> = (
	{ tab },
	{ width, height },
) => tab.viewport(width, height, false);

interface ScreenshotOptions {
	path?: string;
	save?: boolean;
	element?: unknown;
	mask?: unknown;
}

// The page the run draws in: the tester iframe fills the viewport, so the shot
// is the viewport.
const takeScreenshot: BrowserCommand<[string, ScreenshotOptions]> = async (
	context,
	name,
	options,
) => {
	if (!context.testPath)
		throw new Error("Cannot take a screenshot without a test path");
	if (options.element || options.mask)
		throw new Error(
			"the screens browser takes a screenshot of the page, not of an element or with a mask",
		);
	const path = resolveScreenshotPath(
		context.testPath,
		name,
		context.project.config,
		options.path,
	);
	const buffer = await context.tab.screenshot();
	if (options.save) {
		assertBrowserApiWrite(context.project, path);
		assertBrowserFileAccess(context.project, path);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, buffer);
	}
	return { buffer, path };
};

// The inputs the floors send. They name the config's `browser.commands`: the
// page's `commands` module lists a command only if it is registered before the
// first page opens, which the provider, built lazily, is not.
export const inputCommands = {
	press: (({ tab }, x, y) => tab.click(x, y)) as BrowserCommand<
		[number, number]
	>,
	key: (({ tab }, name) => tab.key(name)) as BrowserCommand<[string]>,
};

const commands = {
	__vitest_viewport: viewport,
	__vitest_takeScreenshot: takeScreenshot,
};

class ChromeProvider implements BrowserProvider {
	name = "chrome";
	supportsParallelism = true;
	private lease: Promise<Lease> | undefined;
	private scopes = new Map<string, Scope>();
	private tabs = new Map<string, Tab>();

	constructor(project: TestProject) {
		for (const [name, command] of Object.entries(commands))
			project.browser?.registerCommand(
				name as keyof BrowserCommands,
				command as BrowserCommand<unknown[]>,
			);
		// A terminated run leaves the shared browser without its contexts.
		const release = () => void this.close();
		process.once("SIGINT", release);
		process.once("SIGTERM", release);
	}

	getCommandsContext(sessionId: string) {
		const tab = this.tabs.get(sessionId);
		if (!tab) throw new Error(`no page for the session ${sessionId}`);
		return { tab };
	}

	async openPage(sessionId: string, url: string): Promise<void> {
		this.lease ??= openLease();
		const scope = await (await this.lease).context();
		this.scopes.set(sessionId, scope);
		const tab = await scope.tab();
		this.tabs.set(sessionId, tab);
		await tab.viewport(1280, 800, false);
		await tab.goto(url, 60_000);
	}

	async close(): Promise<void> {
		const lease = this.lease;
		this.lease = undefined;
		this.tabs.clear();
		this.scopes.clear();
		await (await lease)?.release();
	}
}

// The provider the generated Vitest config names: `provider: chrome()`.
export function chrome(): BrowserProviderOption {
	return defineBrowserProvider({
		name: "chrome",
		supportedBrowser: ["chromium"],
		providerFactory: (project) => new ChromeProvider(project),
	});
}
