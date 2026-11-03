import {
	closeSync,
	mkdirSync,
	openSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { browserUrl, Cdp, findChrome, launchChrome, sleep } from "./chrome.ts";
import { Tab } from "./tab.ts";

// The one Chrome every screens command on the machine shares. Its address is
// `chrome.json` in `$XDG_RUNTIME_DIR/stack/` (the OS tmp dir without it); a
// lock file makes the start and the last-one-out check atomic across
// processes. A command opens its own browser context and disposes it at the
// end. A Chrome a command started closes when its last context is gone; one
// `stack screens browser` started stays until `stack screens browser stop`.

export interface BrowserState {
	port: number;
	pid: number;
	// Set by `stack screens browser`: the browser stays after its last context.
	kept?: true;
}

export const stateDir = (
	env: Record<string, string | undefined> = process.env,
): string => join(env.XDG_RUNTIME_DIR || tmpdir(), "stack");

const files = () => {
	const dir = stateDir();
	return {
		dir,
		state: join(dir, "chrome.json"),
		lock: join(dir, "chrome.lock"),
		profile: join(dir, "chrome-profile"),
	};
};

export function parseState(text: string): BrowserState | undefined {
	try {
		const value = JSON.parse(text) as Partial<BrowserState>;
		return Number.isInteger(value.port) && Number.isInteger(value.pid)
			? (value as BrowserState)
			: undefined;
	} catch {
		return undefined;
	}
}

// A lock file holds its owner's pid. It is stale when that process is gone, or,
// while the pid is not yet written, when it is older than `grace` ms.
export function lockIsStale(
	content: string,
	ageMs: number,
	alive: (pid: number) => boolean,
	grace = 10_000,
): boolean {
	const pid = Number(content);
	return Number.isInteger(pid) && pid > 0 ? !alive(pid) : ageMs > grace;
}

export function pidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

const readState = (): BrowserState | undefined => {
	try {
		return parseState(readFileSync(files().state, "utf8"));
	} catch {
		return undefined;
	}
};

async function withLock<T>(body: () => Promise<T>): Promise<T> {
	const { dir, lock } = files();
	mkdirSync(dir, { recursive: true });
	const end = Date.now() + 60_000;
	for (;;) {
		try {
			const fd = openSync(lock, "wx");
			writeSync(fd, String(process.pid));
			closeSync(fd);
			break;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			try {
				const age = Date.now() - statSync(lock).mtimeMs;
				if (lockIsStale(readFileSync(lock, "utf8"), age, pidAlive)) {
					rmSync(lock, { force: true });
					continue;
				}
			} catch {
				continue;
			}
			if (Date.now() > end)
				throw new Error(
					`the browser lock ${lock} is held by another process; remove it if no stack screens command is running`,
				);
			await sleep(50);
		}
	}
	try {
		return await body();
	} finally {
		rmSync(lock, { force: true });
	}
}

// The running browser's endpoint, or undefined when the state file is stale
// (its process is gone or its port does not answer).
async function liveUrl(
	state: BrowserState | undefined,
): Promise<string | undefined> {
	if (!state || !pidAlive(state.pid)) return undefined;
	return browserUrl(state.port);
}

function discard(state: BrowserState | undefined): void {
	const { state: file, profile } = files();
	if (state && pidAlive(state.pid)) {
		try {
			process.kill(state.pid, "SIGKILL");
		} catch {}
	}
	rmSync(file, { force: true });
	rmSync(profile, { recursive: true, force: true });
}

// The browser's endpoint, started when none runs. Call it under the lock.
async function ensure(kept: boolean): Promise<string> {
	const state = readState();
	const url = await liveUrl(state);
	if (url) {
		if (kept && !state?.kept)
			writeFileSync(files().state, JSON.stringify({ ...state, kept: true }));
		return url;
	}
	discard(state);
	const { profile, state: file } = files();
	const { port, pid } = await launchChrome(findChrome(), profile);
	writeFileSync(
		file,
		JSON.stringify(kept ? ({ port, pid, kept: true } as const) : { port, pid }),
	);
	const started = await browserUrl(port, 10_000);
	if (!started) throw new Error(`Chrome on port ${port} does not answer`);
	return started;
}

// What `stack screens browser` does: start the shared browser and leave it.
export async function startBrowser(): Promise<BrowserState> {
	await withLock(() => ensure(true));
	return readState() as BrowserState;
}

// What `stack screens browser stop` does: end the shared browser. False when
// none was running.
export async function stopBrowser(): Promise<boolean> {
	return withLock(async () => {
		const state = readState();
		const url = await liveUrl(state);
		if (!state || !url) {
			discard(state);
			return false;
		}
		try {
			const cdp = await Cdp.connect(url);
			await cdp.send("Browser.close", {}, { timeout: 5000 }).catch(() => {});
			cdp.close();
		} catch {}
		for (let i = 0; i < 50 && pidAlive(state.pid); i++) await sleep(100);
		discard(state);
		return true;
	});
}

// One browser context of a command: its tabs are isolated from every other
// context's, so commands running at once share the browser and nothing else.
export class Scope {
	private cdp: Cdp;
	readonly contextId: string;

	constructor(cdp: Cdp, contextId: string) {
		this.cdp = cdp;
		this.contextId = contextId;
	}

	async tab(url = "about:blank"): Promise<Tab> {
		const { targetId } = await this.cdp.send<{ targetId: string }>(
			"Target.createTarget",
			{
				url,
				browserContextId: this.contextId,
			},
		);
		const { sessionId } = await this.cdp.send<{ sessionId: string }>(
			"Target.attachToTarget",
			{
				targetId,
				flatten: true,
			},
		);
		const tab = new Tab(this.cdp, sessionId, targetId);
		await tab.init();
		return tab;
	}

	dispose(): Promise<unknown> {
		return this.cdp
			.send("Target.disposeBrowserContext", {
				browserContextId: this.contextId,
			})
			.catch(() => {});
	}
}

// A command's connection to the shared browser.
export class Lease {
	private scopes: Scope[] = [];
	private releasing: Promise<void> | undefined;

	private cdp: Cdp;

	constructor(cdp: Cdp) {
		this.cdp = cdp;
	}

	get connection(): Cdp {
		return this.cdp;
	}

	async context(): Promise<Scope> {
		const { browserContextId } = await this.cdp.send<{
			browserContextId: string;
		}>("Target.createBrowserContext", { disposeOnDetach: true });
		const scope = new Scope(this.cdp, browserContextId);
		this.scopes.push(scope);
		return scope;
	}

	// Disposes every context, then closes the browser when this command started
	// it and no other command holds a context. A second call waits for the
	// first, so a signal's release and the command's own end finish together.
	release(): Promise<void> {
		this.releasing ??= this.dispose();
		return this.releasing;
	}

	private async dispose(): Promise<void> {
		await Promise.all(this.scopes.map((scope) => scope.dispose()));
		await withLock(async () => {
			if (this.cdp.closed || readState()?.kept) return;
			const { browserContextIds } = await this.cdp
				.send<{ browserContextIds: string[] }>("Target.getBrowserContexts")
				.catch(() => ({ browserContextIds: ["unknown"] }));
			if (browserContextIds.length > 0) return;
			const state = readState();
			rmSync(files().state, { force: true });
			await this.cdp
				.send("Browser.close", {}, { timeout: 5000 })
				.catch(() => {});
			for (let i = 0; state && i < 50 && pidAlive(state.pid); i++)
				await sleep(100);
			rmSync(files().profile, { recursive: true, force: true });
		}).catch(() => {});
		this.cdp.close();
	}
}

// Connects to the shared browser, starting one when none runs. A connect that
// fails because the browser has just closed starts it once more.
export async function openLease(): Promise<Lease> {
	let last: unknown;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const url = await withLock(() => ensure(false));
			return new Lease(await Cdp.connect(url));
		} catch (error) {
			last = error;
		}
	}
	throw last;
}

// Runs `body` with a lease it releases at the end, on failure, and on SIGINT
// or SIGTERM.
export async function withLease<T>(
	body: (lease: Lease) => Promise<T>,
): Promise<T> {
	const lease = await openLease();
	const onSignal = (signal: NodeJS.Signals) => {
		void lease
			.release()
			.finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
	};
	process.once("SIGINT", onSignal);
	process.once("SIGTERM", onSignal);
	try {
		return await body(lease);
	} finally {
		process.off("SIGINT", onSignal);
		process.off("SIGTERM", onSignal);
		await lease.release();
	}
}
