import { spawn } from "node:child_process";
import { accessSync, constants, readFileSync } from "node:fs";
import { delimiter, join } from "node:path";

// The Chrome the screens commands drive, and the DevTools protocol (CDP) client
// that talks to it over Node's own WebSocket. Nothing here waits without a
// limit: every call rejects, naming what it waited for.

const NAMES = ["chromium", "google-chrome", "google-chrome-stable"];

export const NO_CHROME =
	"no Chrome found: install chromium or google-chrome, or set CHROME_PATH to a Chrome executable";

// The Chrome to launch: `CHROME_PATH`, else the first of the usual names on
// PATH. One actionable line when there is none.
export function findChrome(
	env: Record<string, string | undefined> = process.env,
	executable: (path: string) => boolean = isExecutable,
): string {
	const chosen = env.CHROME_PATH;
	if (chosen) {
		if (executable(chosen)) return chosen;
		throw new Error(
			`CHROME_PATH ${chosen} is not an executable: point it at a Chrome, or unset it to use chromium or google-chrome from PATH`,
		);
	}
	const dirs = (env.PATH ?? "").split(delimiter).filter(Boolean);
	for (const name of NAMES) {
		for (const dir of dirs) {
			const path = join(dir, name);
			if (executable(path)) return path;
		}
	}
	throw new Error(NO_CHROME);
}

function isExecutable(path: string): boolean {
	try {
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

export const CHROME_ARGS = [
	"--headless=new",
	"--no-sandbox",
	"--hide-scrollbars",
	"--font-render-hinting=none",
	"--no-first-run",
	// A hovering fine pointer: headless Chrome reports no hover without it, so
	// hover-gated styles would never draw.
	"--blink-settings=primaryHoverType=2,primaryPointerType=4",
];

export const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

// Starts Chrome detached on a free debugging port with its own profile, and
// resolves with the port it chose, which it writes to `DevToolsActivePort`.
export async function launchChrome(
	executable: string,
	userDataDir: string,
	timeout = 20_000,
): Promise<{ port: number; pid: number }> {
	const child = spawn(
		executable,
		[
			...CHROME_ARGS,
			"--remote-debugging-port=0",
			`--user-data-dir=${userDataDir}`,
			"about:blank",
		],
		{ detached: true, stdio: "ignore" },
	);
	let exited: string | undefined;
	child.on("exit", (code, signal) => {
		exited = `exited with ${code ?? signal}`;
	});
	const spawnFailure = new Promise<never>((_, reject) =>
		child.on("error", (error) =>
			reject(new Error(`cannot start ${executable}: ${error.message}`)),
		),
	);
	const portFile = join(userDataDir, "DevToolsActivePort");
	const ready = (async () => {
		const end = Date.now() + timeout;
		while (Date.now() < end) {
			if (exited) throw new Error(`${executable} ${exited} before it listened`);
			try {
				const port = Number(readFileSync(portFile, "utf8").split("\n")[0]);
				if (port > 0) return port;
			} catch {}
			await sleep(50);
		}
		throw new Error(
			`${executable} did not open its debugging port within ${timeout} ms`,
		);
	})();
	try {
		const port = await Promise.race([ready, spawnFailure]);
		child.unref();
		return { port, pid: child.pid as number };
	} catch (error) {
		child.kill("SIGKILL");
		throw error;
	}
}

type Handler = (params: never, sessionId: string | undefined) => void;

interface Pending {
	method: string;
	resolve: (value: never) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
}

export const CALL_TIMEOUT = 30_000;

// One connection to Chrome's browser endpoint. A call to a tab names its
// `sessionId` (flat sessions); `Session` binds it.
export class Cdp {
	private id = 0;
	private pending = new Map<number, Pending>();
	private handlers = new Set<{ method: string; handler: Handler }>();
	closed = false;

	private socket: WebSocket;

	private constructor(socket: WebSocket) {
		this.socket = socket;
		socket.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data));
			if (message.id !== undefined) {
				const call = this.pending.get(message.id);
				if (!call) return;
				this.pending.delete(message.id);
				clearTimeout(call.timer);
				if (message.error)
					call.reject(
						new Error(`CDP ${call.method}: ${message.error.message}`),
					);
				else call.resolve(message.result as never);
				return;
			}
			for (const { method, handler } of this.handlers)
				if (method === message.method)
					handler(message.params as never, message.sessionId);
		});
		socket.addEventListener("close", () => this.fail("the connection closed"));
		socket.addEventListener("error", () => this.fail("the connection failed"));
	}

	static connect(url: string, timeout = 10_000): Promise<Cdp> {
		return new Promise((resolve, reject) => {
			const socket = new WebSocket(url);
			const timer = setTimeout(() => {
				socket.close();
				reject(
					new Error(`CDP connect to ${url} timed out after ${timeout} ms`),
				);
			}, timeout);
			socket.addEventListener("open", () => {
				clearTimeout(timer);
				resolve(new Cdp(socket));
			});
			socket.addEventListener("error", () => {
				clearTimeout(timer);
				reject(new Error(`CDP connect to ${url} failed`));
			});
		});
	}

	private fail(reason: string): void {
		this.closed = true;
		for (const call of this.pending.values()) {
			clearTimeout(call.timer);
			call.reject(new Error(`CDP ${call.method}: ${reason}`));
		}
		this.pending.clear();
	}

	send<T = unknown>(
		method: string,
		params: object = {},
		options: { sessionId?: string; timeout?: number } = {},
	): Promise<T> {
		if (this.closed)
			return Promise.reject(
				new Error(`CDP ${method}: the connection is closed`),
			);
		const id = ++this.id;
		const timeout = options.timeout ?? CALL_TIMEOUT;
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`CDP ${method} timed out after ${timeout} ms`));
			}, timeout);
			this.pending.set(id, { method, resolve, reject, timer });
			this.socket.send(
				JSON.stringify({ id, method, params, sessionId: options.sessionId }),
			);
		});
	}

	on(method: string, handler: Handler): () => void {
		const entry = { method, handler };
		this.handlers.add(entry);
		return () => this.handlers.delete(entry);
	}

	close(): void {
		this.closed = true;
		this.socket.close();
	}
}

// The browser endpoint of a Chrome on `port`, or undefined when nothing
// answers there within `timeout`.
export async function browserUrl(
	port: number,
	timeout = 2000,
): Promise<string | undefined> {
	try {
		const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
			signal: AbortSignal.timeout(timeout),
		});
		const { webSocketDebuggerUrl } = (await response.json()) as {
			webSocketDebuggerUrl?: string;
		};
		return webSocketDebuggerUrl;
	} catch {
		return undefined;
	}
}
