import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import { type Cdp, sleep } from "./chrome.ts";

// One tab, driven over CDP: navigation, evaluation, the viewport, real input
// and screenshots. Every call carries its own timeout (`Cdp.send`).

// Widths under this draw as a phone: touch input, a coarse pointer. The
// contract's first breakpoint, where the touch set gives way to the desktop one.
export const TOUCH_BELOW = BREAKPOINT_PX.tablet;

const KEYS: Record<string, { code: string; vk: number; text?: string }> = {
	Enter: { code: "Enter", vk: 13, text: "\r" },
	Escape: { code: "Escape", vk: 27 },
	Tab: { code: "Tab", vk: 9 },
	Backspace: { code: "Backspace", vk: 8 },
	Delete: { code: "Delete", vk: 46 },
	Space: { code: "Space", vk: 32, text: " " },
	ArrowUp: { code: "ArrowUp", vk: 38 },
	ArrowDown: { code: "ArrowDown", vk: 40 },
	ArrowLeft: { code: "ArrowLeft", vk: 37 },
	ArrowRight: { code: "ArrowRight", vk: 39 },
	Home: { code: "Home", vk: 36 },
	End: { code: "End", vk: 35 },
	PageUp: { code: "PageUp", vk: 33 },
	PageDown: { code: "PageDown", vk: 34 },
};

interface EvaluateResult {
	exceptionDetails?: { text: string; exception?: { description?: string } };
	result: { value: unknown };
}

// A request the tab has sent and not seen end: its type, its response's type,
// and when its headers came (0 while they have not).
export interface OpenRequest {
	type: string;
	mime: string;
	headersAt: number;
}

// How long a response with its headers in may keep its body open before it
// counts as held by design (a stream, a long poll) and not as loading.
export const HELD_MS = 1500;

// The requests that keep a page busy: not an event stream or an EventSource,
// and not a response whose headers came HELD_MS ago and whose body is still
// open. A request still awaiting its headers counts; only the cap ends the
// wait on it.
export function busyRequests(
	requests: Iterable<OpenRequest>,
	now: number,
): number {
	let busy = 0;
	for (const request of requests) {
		if (request.type === "EventSource" || request.mime === "text/event-stream")
			continue;
		if (request.headersAt > 0 && now - request.headersAt >= HELD_MS) continue;
		busy++;
	}
	return busy;
}

export interface ControlPoint {
	x: number;
	y: number;
	label: string;
	// Whether the element at the point is the control or inside it.
	ok: boolean;
	hit: string;
}

export class Tab {
	touch = false;
	private open = new Map<string, OpenRequest>();
	private lastNet = 0;
	private loadedAt = 0;

	readonly cdp: Cdp;
	readonly sessionId: string;
	readonly targetId: string;

	constructor(cdp: Cdp, sessionId: string, targetId: string) {
		this.cdp = cdp;
		this.sessionId = sessionId;
		this.targetId = targetId;
	}

	send<T = unknown>(method: string, params: object = {}, timeout?: number) {
		return this.cdp.send<T>(method, params, {
			sessionId: this.sessionId,
			timeout,
		});
	}

	private listen<P>(method: string, handler: (params: P) => void): void {
		this.cdp.on(method, (params: unknown, sessionId) => {
			if (sessionId === this.sessionId) handler(params as P);
		});
	}

	async init(): Promise<void> {
		this.listen(
			"Network.requestWillBeSent",
			(p: { requestId: string; type?: string }) => {
				this.open.set(p.requestId, {
					type: p.type ?? "",
					mime: "",
					headersAt: 0,
				});
				this.lastNet = Date.now();
			},
		);
		this.listen(
			"Network.responseReceived",
			(p: { requestId: string; response: { mimeType?: string } }) => {
				const request = this.open.get(p.requestId);
				if (request) {
					request.mime = p.response.mimeType ?? "";
					request.headersAt = Date.now();
				}
			},
		);
		const done = (p: { requestId: string }) => {
			this.open.delete(p.requestId);
			this.lastNet = Date.now();
		};
		this.listen("Network.loadingFinished", done);
		this.listen("Network.loadingFailed", done);
		this.listen<void>("Page.loadEventFired", () => {
			this.loadedAt = Date.now();
		});
		// A page that guards its edits asks before it unloads: a goto leaves it.
		this.listen("Page.javascriptDialogOpening", () => {
			void this.send("Page.handleJavaScriptDialog", { accept: true }).catch(
				() => {},
			);
		});
		await Promise.all([this.send("Page.enable"), this.send("Network.enable")]);
		await this.media();
	}

	// Reduced motion always, so a page is judged at rest; the colour scheme when
	// asked for.
	media(mode?: string): Promise<unknown> {
		return this.send("Emulation.setEmulatedMedia", {
			features: [
				{ name: "prefers-reduced-motion", value: "reduce" },
				...(mode ? [{ name: "prefers-color-scheme", value: mode }] : []),
			],
		});
	}

	// The viewport at scale 1, with touch input on under `TOUCH_BELOW`.
	async viewport(
		width: number,
		height: number,
		touch = width < TOUCH_BELOW,
	): Promise<void> {
		await this.send("Emulation.setDeviceMetricsOverride", {
			width,
			height,
			deviceScaleFactor: 1,
			mobile: false,
		});
		// Only a change is sent: switching touch emulation off, even when it was
		// never on, drops the launch flag's fine pointer.
		if (touch === this.touch) return;
		this.touch = touch;
		await this.send("Emulation.setTouchEmulationEnabled", {
			enabled: touch,
			maxTouchPoints: touch ? 5 : 1,
		});
	}

	async goto(url: string, timeout = 30_000): Promise<void> {
		const since = Date.now();
		const { errorText } = await this.send<{ errorText?: string }>(
			"Page.navigate",
			{ url },
			timeout,
		);
		if (errorText) throw new Error(`cannot open ${url}: ${errorText}`);
		const end = since + timeout;
		while (this.loadedAt < since) {
			if (Date.now() > end)
				throw new Error(`${url} did not finish loading within ${timeout} ms`);
			await sleep(50);
		}
	}

	async evaluate<T = unknown>(
		expression: string,
		timeout?: number,
	): Promise<T> {
		const result = await this.send<EvaluateResult>(
			"Runtime.evaluate",
			{ expression, awaitPromise: true, returnByValue: true },
			timeout,
		);
		if (result.exceptionDetails)
			throw new Error(
				`page script failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`,
			);
		return result.result.value as T;
	}

	// Waits until the page is quiet: loaded, no busy request (`busyRequests`)
	// in flight or ended in the last 400 ms, and nothing `aria-busy`; or `cap`
	// ms. The page that never goes quiet ends at the cap, and returns what it
	// was still waiting for.
	async settle(cap: number, busy: string): Promise<string | undefined> {
		const end = Date.now() + cap;
		this.lastNet = Date.now();
		await sleep(300);
		while (Date.now() < end) {
			if (
				busyRequests(this.open.values(), Date.now()) === 0 &&
				Date.now() - this.lastNet >= 400
			) {
				const idle = await this.evaluate<boolean>(
					`document.readyState==="complete"&&document.querySelector(${JSON.stringify(busy)})===null`,
				).catch(() => false);
				if (idle) return undefined;
			}
			await sleep(100);
		}
		return `still busy after ${cap} ms (${busyRequests(this.open.values(), Date.now())} requests open)`;
	}

	async screenshot(): Promise<Buffer> {
		const { data } = await this.send<{ data: string }>(
			"Page.captureScreenshot",
			{
				format: "png",
			},
		);
		return Buffer.from(data, "base64");
	}

	async click(x: number, y: number): Promise<void> {
		if (this.touch) {
			await this.send("Input.dispatchTouchEvent", {
				type: "touchStart",
				touchPoints: [{ x, y }],
			});
			await this.send("Input.dispatchTouchEvent", {
				type: "touchEnd",
				touchPoints: [],
			});
			return;
		}
		const at = { x, y, button: "left", clickCount: 1 };
		await this.send("Input.dispatchMouseEvent", { ...at, type: "mouseMoved" });
		await this.send("Input.dispatchMouseEvent", {
			...at,
			type: "mousePressed",
		});
		await this.send("Input.dispatchMouseEvent", {
			...at,
			type: "mouseReleased",
		});
	}

	// The pointer off the page, so nothing stays hovered (and no tooltip open
	// for it) from a press made before. A touch tab has no pointer to move.
	async rest(): Promise<void> {
		if (this.touch) return;
		await this.send("Input.dispatchMouseEvent", {
			type: "mouseMoved",
			x: -1,
			y: -1,
		});
	}

	async key(name: string): Promise<void> {
		const known = KEYS[name];
		if (!known && [...name].length !== 1)
			throw new Error(
				`unknown key "${name}": one of ${Object.keys(KEYS).join(", ")}, or one character`,
			);
		const base = known
			? {
					key: name,
					code: known.code,
					windowsVirtualKeyCode: known.vk,
					text: known.text,
				}
			: { key: name, text: name };
		await this.send("Input.dispatchKeyEvent", {
			...base,
			type: base.text ? "keyDown" : "rawKeyDown",
		});
		await this.send("Input.dispatchKeyEvent", { ...base, type: "keyUp" });
	}

	async type(text: string): Promise<void> {
		for (const char of text) await this.key(char);
	}

	// Presses the control `point` (a page script's answer) names: a hit test
	// first, so a control something covers is an error, never a silent miss.
	async press(point: ControlPoint | null, what: string): Promise<void> {
		if (!point) throw new Error(`no control named "${what}"`);
		if (!point.ok)
			throw new Error(
				`"${point.label}" is covered by ${point.hit} at ${Math.round(point.x)},${Math.round(point.y)}`,
			);
		await this.click(point.x, point.y);
	}

	async offline(offline: boolean): Promise<void> {
		await this.send("Network.emulateNetworkConditions", {
			offline,
			latency: 0,
			downloadThroughput: -1,
			uploadThroughput: -1,
		});
	}

	async cookie(name: string, value: string, url: string): Promise<void> {
		const { success } = await this.send<{ success: boolean }>(
			"Network.setCookie",
			{
				name,
				value,
				url,
			},
		);
		if (!success)
			throw new Error(`Chrome refused the cookie ${name} for ${url}`);
	}

	async close(): Promise<void> {
		await this.cdp
			.send("Target.closeTarget", { targetId: this.targetId })
			.catch(() => {});
	}
}
