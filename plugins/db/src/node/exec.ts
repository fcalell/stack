import { spawnSync } from "node:child_process";

// Shared synchronous shell-out used by every drizzle-kit / wrangler invocation
// in the node layer. Throws with combined stderr/stdout on a non-zero exit so
// callers surface the tool's own error text.
export function runCommand(
	command: string,
	args: string[],
	cwd: string,
): { stdout: string; stderr: string } {
	const result = spawnSync(command, args, {
		cwd,
		stdio: "pipe",
		env: { ...process.env },
	});

	const stdout = result.stdout?.toString().trim() ?? "";
	const stderr = result.stderr?.toString().trim() ?? "";

	if (result.status !== 0) {
		throw new Error(
			`Command failed: ${command} ${args.join(" ")}\n${stderr || stdout}`,
		);
	}

	return { stdout, stderr };
}
