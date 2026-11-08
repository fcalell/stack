import assert from "node:assert/strict";
import { test } from "node:test";
import { type SupervisedProcess, supervise } from "../lib/proc.ts";
import { stopAll } from "./dev.ts";

const sleeper = (name: string, code: string) =>
	supervise({
		spec: { name, command: process.execPath, args: ["-e", code] },
		onOutput: () => {},
	});

// A launcher like `npx wrangler dev` runs the server as its own child: `sh`
// starts `sleep` and prints its pid.
const launcher = (name: string, prelude = "") =>
	supervise({
		spec: {
			name,
			command: "sh",
			args: ["-c", `${prelude}sleep 30 >/dev/null 2>&1 & echo $!; wait`],
		},
		onOutput: () => {},
	});

const firstLine = (proc: SupervisedProcess) =>
	new Promise<number>((resolve) => {
		proc
			.current()
			?.stdout?.once("data", (b: Buffer) => resolve(Number(b.toString())));
	});

async function gone(pid: number): Promise<boolean> {
	const deadline = Date.now() + 2000;
	while (Date.now() < deadline) {
		try {
			process.kill(pid, 0);
		} catch {
			return true;
		}
		await new Promise((r) => setTimeout(r, 50));
	}
	process.kill(pid, "SIGKILL");
	return false;
}

test("stopAll stops what a process started", async () => {
	const proc = launcher("launcher");
	const grandchild = await firstLine(proc);
	await stopAll([proc], 3000);
	assert.equal(await gone(grandchild), true);
});

test("stopAll kills what a stubborn process started after the grace", async () => {
	const proc = launcher("stubborn-launcher", "trap '' TERM; ");
	const grandchild = await firstLine(proc);
	await stopAll([proc], 400);
	assert.equal(await gone(grandchild), true);
	await proc.done;
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
