// Why a child process failed, or null when it passed. A process killed by a
// signal (the OOM killer's SIGKILL, a Ctrl-C) exits with no code: that is no
// pass, so `stack screens test` never exits 0 over a run that did not finish.
export function exitFailure(
	label: string,
	code: number | null,
	signal: NodeJS.Signals | null,
): string | null {
	if (code === 0) return null;
	if (code === null) return `${label} was killed by ${signal ?? "a signal"}`;
	return `${label} exited with ${code}`;
}
