import { describe, expect, it, vi } from "vitest";
import { restartBackoffMs, supervise } from "#lib/proc";
import type { ProcessExit } from "#specs";

const identity = (s: string) => s;

// Silence stdout/stderr noise from the supervised child; we don't care about
// log fidelity here, we care about state transitions.
function swallowIo<T>(fn: () => Promise<T>): Promise<T> {
	const outSpy = vi
		.spyOn(process.stdout, "write")
		.mockImplementation(() => true);
	const errSpy = vi
		.spyOn(process.stderr, "write")
		.mockImplementation(() => true);
	return fn().finally(() => {
		outSpy.mockRestore();
		errSpy.mockRestore();
	});
}

describe("supervise — lifecycle classification", () => {
	it("classifies a port-in-use exit when stderr matches the default pattern", async () => {
		const script =
			'process.stderr.write("Error: listen EADDRINUSE: address already in use :::3000\\n"); process.exit(1);';

		const exitEvent = await swallowIo(async () => {
			const proc = supervise({
				spec: {
					name: "fake-vite",
					command: process.execPath,
					args: ["-e", script],
					defaultPort: 3000,
				},
				color: identity,
				cwd: process.cwd(),
			});
			return proc.done;
		});

		expect(exitEvent.portInUse).toBe(true);
		expect(exitEvent.detectedPort).toBe(3000);
		expect(exitEvent.code).toBe(1);
	});

	it("uses a custom portConflictPattern over the default when supplied", async () => {
		const script =
			'process.stderr.write("custom-port-error :: 4200\\n"); process.exit(1);';
		const exitEvent = await swallowIo(async () => {
			const proc = supervise({
				spec: {
					name: "fake",
					command: process.execPath,
					args: ["-e", script],
					portConflictPattern: /custom-port-error/,
					defaultPort: 4200,
				},
				color: identity,
				cwd: process.cwd(),
			});
			return proc.done;
		});
		expect(exitEvent.portInUse).toBe(true);
		expect(exitEvent.detectedPort).toBe(4200);
	});

	it("honors portConflictPattern=null to opt out of classification", async () => {
		const script =
			'process.stderr.write("Error: listen EADDRINUSE: :::9999\\n"); process.exit(1);';
		const exitEvent = await swallowIo(async () => {
			const proc = supervise({
				spec: {
					name: "fake",
					command: process.execPath,
					args: ["-e", script],
					portConflictPattern: null,
				},
				color: identity,
				cwd: process.cwd(),
			});
			return proc.done;
		});
		expect(exitEvent.portInUse).toBe(false);
	});

	it("captures a trailing slice of stderr for the exit event", async () => {
		const script =
			'process.stderr.write("first line\\nsecond line\\nThirdLineMarker\\n"); process.exit(7);';
		const exitEvent = await swallowIo(async () => {
			const proc = supervise({
				spec: {
					name: "fake",
					command: process.execPath,
					args: ["-e", script],
				},
				color: identity,
				cwd: process.cwd(),
			});
			return proc.done;
		});
		expect(exitEvent.stderrTail).toContain("ThirdLineMarker");
		expect(exitEvent.code).toBe(7);
	});
});

describe("supervise — restart policy", () => {
	it('with restart="never" stops after the first exit', async () => {
		let launches = 0;
		const script = 'process.stderr.write("bye\\n"); process.exit(1);';
		const exitEvent = await swallowIo(async () => {
			const proc = supervise({
				spec: {
					name: "once",
					command: process.execPath,
					args: ["-e", script],
					restart: "never",
				},
				color: identity,
				cwd: process.cwd(),
				onLifecycle: () => {
					launches++;
				},
			});
			return proc.done;
		});
		expect(exitEvent.restartAttempt).toBe(0);
		expect(launches).toBe(1);
	});

	it('with restart="on-crash" retries on non-zero exit and stops at maxRestarts', async () => {
		const exitEvents: ProcessExit[] = [];
		await swallowIo(async () => {
			const proc = supervise({
				spec: {
					name: "crashy",
					command: process.execPath,
					args: ["-e", "process.exit(1);"],
					restart: "on-crash",
					maxRestarts: 2,
				},
				color: identity,
				cwd: process.cwd(),
				onLifecycle: (event) => {
					exitEvents.push(event);
				},
			});
			return proc.done;
		});
		// 1 initial + 2 restarts = 3 exits, restartAttempts 0/1/2
		expect(exitEvents.map((e) => e.restartAttempt)).toEqual([0, 1, 2]);
	}, 15_000);

	it("lets onExit veto a restart by returning { restart: false }", async () => {
		const exitEvents: ProcessExit[] = [];
		await swallowIo(async () => {
			const proc = supervise({
				spec: {
					name: "vetoed",
					command: process.execPath,
					args: ["-e", "process.exit(1);"],
					restart: "on-crash",
					maxRestarts: 5,
					onExit: () => ({ restart: false }),
				},
				color: identity,
				cwd: process.cwd(),
				onLifecycle: (event) => {
					exitEvents.push(event);
				},
			});
			return proc.done;
		});
		expect(exitEvents).toHaveLength(1);
	});
});

describe("restartBackoffMs", () => {
	it("is exponential and capped at 10s", () => {
		expect(restartBackoffMs(1)).toBe(250);
		expect(restartBackoffMs(2)).toBe(500);
		expect(restartBackoffMs(3)).toBe(1_000);
		expect(restartBackoffMs(20)).toBe(10_000);
	});
});
