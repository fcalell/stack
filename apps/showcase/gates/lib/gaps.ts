import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

// Totals the skipped tests per gate and reason, so a gap reads as a gap
// rather than a pass.
export default class Gaps implements Reporter {
	private readonly gaps = new Map<string, number>();

	onTestEnd(test: TestCase, result: TestResult): void {
		if (result.status !== "skipped") return;
		const reason =
			test.annotations.find((annotation) => annotation.type === "skip")
				?.description ?? "skipped";
		// ["", project, file, ...describes, title]
		const gate = test.titlePath().slice(3, -1).join(" › ");
		const key = `${gate}: ${reason}`;
		this.gaps.set(key, (this.gaps.get(key) ?? 0) + 1);
	}

	onEnd(): void {
		for (const [key, count] of this.gaps)
			console.log(`  gap  ${key} × ${count}`);
	}

	printsToStdio(): boolean {
		return false;
	}
}
