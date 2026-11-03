import { type ChildProcess, spawn } from "node:child_process";
import { closeSync, openSync, readFileSync } from "node:fs";
import { connect } from "node:net";
import { join } from "node:path";
import type { ServeRun } from "../types.ts";

// A server a `stack screens serve` run starts: its output goes to `<dir>/<name>.log`,
// the run's own stdout holds one line.

const READY_MS = 120_000;
const STOP_MS = 3000;

function listening(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = connect(port, "127.0.0.1");
		socket.once("connect", () => {
			socket.destroy();
			resolve(true);
		});
		socket.once("error", () => resolve(false));
	});
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs a command in `serve.cwd` with the run's environment on top of the
// process's, and resolves once the command's server accepts connections on
// `serve.port`. A command that exits before that fails with its log's tail.
// Resolves to what stops it: the command's whole process group, then its files.
export async function startServer(
	serve: ServeRun,
	name: string,
	command: string,
	args: string[],
	env: Record<string, string> = {},
): Promise<() => Promise<void>> {
	const logFile = join(serve.dir, `${name}.log`);
	const log = openSync(logFile, "a");
	const child: ChildProcess = spawn(command, args, {
		cwd: serve.cwd,
		stdio: ["ignore", log, log],
		env: { ...process.env, ...env, ...serve.env },
		detached: true,
	});
	closeSync(log);
	let exited = false;
	const done = new Promise<void>((resolve) => {
		child.once("exit", () => {
			exited = true;
			resolve();
		});
		child.once("error", () => {
			exited = true;
			resolve();
		});
	});
	const stop = async () => {
		if (exited || child.pid === undefined) return;
		const group = (signal: NodeJS.Signals) => {
			try {
				process.kill(-(child.pid as number), signal);
			} catch {}
		};
		group("SIGTERM");
		const timer = setTimeout(() => group("SIGKILL"), STOP_MS);
		await done;
		clearTimeout(timer);
	};

	const deadline = Date.now() + READY_MS;
	while (!(await listening(serve.port))) {
		if (exited || Date.now() > deadline) {
			await stop();
			const tail = readFileSync(logFile, "utf8").trim().split("\n").slice(-20);
			throw new Error(
				`${name} ${exited ? "stopped" : "did not answer"} on port ${serve.port}:\n${tail.join("\n")}`,
			);
		}
		await sleep(150);
	}
	return stop;
}
