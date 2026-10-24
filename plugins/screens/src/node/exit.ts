import { existsSync } from "node:fs";

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

// Playwright's error for a browser that was never installed. It surfaces in the
// run's stderr, because the headless shell, the executable a headless launch
// takes, is a different download from the full Chromium.
const MISSING_BROWSER = /Executable doesn't exist/;

const INSTALL_BROWSER =
	"run `npx playwright install chromium`, or set CHROME_PATH to a Chrome to launch";

// The one actionable line for a test run that could not launch its browser,
// from what the run wrote to stderr; null for any other failure.
export function missingBrowser(stderr: string): string | null {
	return MISSING_BROWSER.test(stderr)
		? `stack screens test: no browser to launch: ${INSTALL_BROWSER}`
		: null;
}

// `CHROME_PATH` names the Chrome to launch in place of Playwright's own: a path
// that does not exist fails before anything is generated or started.
export function chromePathProblem(
	chromePath: string | undefined,
	exists: (path: string) => boolean = existsSync,
): string | null {
	if (!chromePath || exists(chromePath)) return null;
	return `stack screens test: CHROME_PATH ${chromePath} does not exist: point it at a Chrome, or unset it and run \`npx playwright install chromium\``;
}
