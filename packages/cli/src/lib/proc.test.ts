import assert from "node:assert/strict";
import { test } from "node:test";
import { supervise } from "./proc.ts";

test("a missing binary settles with the spawn error instead of hanging", async () => {
	const events: number[] = [];
	const proc = supervise({
		spec: { name: "ghost", command: "stack-no-such-binary-xyz", args: [] },
		color: (s) => s,
		onLifecycle: () => events.push(1),
	});
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error("done never settled")), 2000).unref(),
	);
	const exit = await Promise.race([proc.done, timeout]);
	assert.equal(exit.code, null);
	assert.equal(exit.signal, null);
	assert.match(exit.stderrTail, /ENOENT/);
	assert.equal(events.length, 1);
});

test("stop cancels a pending restart and settles done", async () => {
	const proc = supervise({
		spec: {
			name: "crash",
			command: process.execPath,
			args: ["-e", "process.exit(3)"],
			restart: "always",
		},
		color: (s) => s,
		onLifecycle: () => {
			// Stop from inside the first exit: the restart timer is not set yet.
		},
	});
	// Wait for the first exit, then stop during the backoff.
	await new Promise((r) => setTimeout(r, 600));
	proc.stop();
	const exit = await Promise.race([
		proc.done,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("done never settled")), 2000).unref(),
		),
	]);
	assert.equal(exit.code, 3);
});
