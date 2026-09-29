import { join } from "node:path";
import { StackError } from "@fcalell/cli/errors";

// The pre-build geometry gate over the consumer's `src/` tree, with the web
// host rule: a class attribute is legal on a bare lowercase intrinsic tag
// only. The gate subpath is dynamic-imported so ts-morph loads during
// `stack build` alone, never on config load, `generate`, or `dev`.
export async function runGeometryGate(cwd: string): Promise<void> {
	const { formatViolations, scanGeometry } = await import(
		"@fcalell/ui-core/gate"
	);
	const violations = scanGeometry(join(cwd, "src"), "intrinsic");
	if (violations.length === 0) return;
	throw new StackError(formatViolations(violations, "src"), "GEOMETRY_GATE");
}
