import { type ChildProcess, spawn } from "node:child_process";
import { createInterface } from "node:readline";

export interface ManagedProcess {
	name: string;
	child: ChildProcess;
	kill(): void;
}

export function spawnPrefixed(opts: {
	name: string;
	color: (s: string) => string;
	command: string;
	args: string[];
	cwd?: string;
}): ManagedProcess {
	const prefix = opts.color(`[${opts.name}]`);

	const child = spawn(opts.command, opts.args, {
		stdio: ["ignore", "pipe", "pipe"],
		cwd: opts.cwd,
	});

	if (child.stdout) {
		const rl = createInterface({ input: child.stdout });
		rl.on("line", (line) => {
			process.stdout.write(`${prefix} ${line}\n`);
		});
	}

	if (child.stderr) {
		const rl = createInterface({ input: child.stderr });
		rl.on("line", (line) => {
			process.stderr.write(`${prefix} ${line}\n`);
		});
	}

	return {
		name: opts.name,
		child,
		kill() {
			if (!child.killed) child.kill("SIGTERM");
		},
	};
}

export function killAll(processes: ManagedProcess[]): void {
	for (const proc of processes) proc.kill();
}

export function onExit(processes: ManagedProcess[]): void {
	const handler = () => {
		killAll(processes);
		process.exit(0);
	};
	process.on("SIGINT", handler);
	process.on("SIGTERM", handler);
}
