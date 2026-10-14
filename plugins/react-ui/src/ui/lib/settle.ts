// The settle: the page's one large motion, the switch from a waiting form
// to the loaded one (`useWait`, `./loading.ts`). Every switch asked for in a
// frame is gathered and applied together inside one view transition, so the
// browser moves each named Section and Group from its old place to its new by
// a transform (`globals.css` sets the duration) while the root crossfades.

/** What the coordinator reads of the page; the document's own in the app, a stand-in in a test. */
export interface SettleEnv {
	/** Runs `run` before the next paint. */
	frame(run: () => void): void;
	/** Whether the viewer asked for reduced motion. */
	reduced(): boolean;
	/** Whether the document is hidden, where a frame never comes. */
	hidden(): boolean;
	/** Whether a view transition runs, the router's or any other. */
	running(): boolean;
	/** Starts a view transition around `update`; `undefined`, with `update` not called, where the browser has none. */
	start(update: () => void): { finished: Promise<unknown> } | undefined;
	/** Applies `run` and commits what it set before returning. */
	flush(run: () => void): void;
}

export interface Settle {
	/** Asks for `apply` to run as part of the next settle; returns the call that withdraws it. */
	request(apply: () => void): () => void;
}

/** A coordinator over `env`: the switches asked for in one frame run together, in a view transition unless motion is reduced, the browser has none, the document is hidden or a transition already runs, and then at once. */
export function createSettle(env: SettleEnv): Settle {
	let queue = new Set<() => void>();
	let scheduled = false;
	// Our own transition, from its start until it has finished.
	let ours = false;
	const run = () => {
		scheduled = false;
		const batch = queue;
		queue = new Set();
		if (batch.size === 0) return;
		const apply = () => {
			for (const one of batch) one();
		};
		if (ours || env.reduced() || env.hidden() || env.running()) {
			apply();
			return;
		}
		const moving = env.start(() => env.flush(apply));
		if (!moving) {
			apply();
			return;
		}
		ours = true;
		const done = () => {
			ours = false;
		};
		moving.finished.then(done, done);
	};
	return {
		request(apply) {
			// Where no frame comes the switch is not held for one.
			if (env.hidden()) {
				apply();
				return () => {};
			}
			queue.add(apply);
			if (!scheduled) {
				scheduled = true;
				env.frame(run);
			}
			return () => {
				queue.delete(apply);
			};
		},
	};
}
