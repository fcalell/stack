import assert from "node:assert/strict";
import { test } from "node:test";
import { supervise } from "./proc.ts";

test("a missing binary settles with the spawn error instead of hanging", async () => {
	const events: number[] = [];
	const proc = supervise({
		spec: { name: "ghost", command: "stack-no-such-binary-xyz", args: [] },
		onOutput: () => {},
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
	let exited!: () => void;
	const firstExit = new Promise<void>((resolve) => {
		exited = resolve;
	});
	const proc = supervise({
		spec: {
			name: "crash",
			command: process.execPath,
			args: ["-e", "process.exit(3)"],
			restart: "always",
		},
		onOutput: () => {},
		onLifecycle: () => exited(),
	});
	// The supervisor sets the restart timer after the event returns, and the
	// await resumes after that: the stop lands in the backoff.
	await firstExit;
	proc.stop();
	const exit = await Promise.race([
		proc.done,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("done never settled")), 2000).unref(),
		),
	]);
	assert.equal(exit.code, 3);
});

test("each launch reports its attempt and each line its stream", async () => {
	const launches: number[] = [];
	const lines: string[] = [];
	const proc = supervise({
		spec: {
			name: "twice",
			command: process.execPath,
			args: ["-e", "console.log('out'); console.error('err'); process.exit(1)"],
			restart: "on-crash",
			maxRestarts: 1,
		},
		onOutput: (stream, line) => lines.push(`${stream} ${line}`),
		onLaunch: (attempt) => launches.push(attempt),
	});
	await proc.done;
	assert.deepEqual(launches, [0, 1]);
	assert.deepEqual(lines.sort(), [
		"stderr err",
		"stderr err",
		"stdout out",
		"stdout out",
	]);
});
