import assert from "node:assert/strict";
import { test } from "node:test";
import { supervise } from "../lib/proc.ts";
import { stopAll } from "./dev.ts";

const sleeper = (name: string, code: string) =>
	supervise({
		spec: { name, command: process.execPath, args: ["-e", code] },
		color: (s) => s,
	});

test("stopAll waits for the processes to exit", async () => {
	const proc = sleeper("sleepy", "setInterval(() => {}, 1000)");
	await new Promise((r) => setTimeout(r, 300));
	await stopAll([proc], 3000);
	assert.equal(proc.current()?.signalCode, "SIGTERM");
});

test("stopAll kills a process that ignores SIGTERM after the grace", async () => {
	const proc = sleeper(
		"stubborn",
		"process.on('SIGTERM', () => {}); console.log('up'); setInterval(() => {}, 1000)",
	);
	await new Promise((r) => setTimeout(r, 500));
	const started = Date.now();
	await stopAll([proc], 400);
	assert.ok(Date.now() - started >= 400);
	await proc.done;
	assert.equal(proc.current()?.signalCode, "SIGKILL");
});
