import { join } from "node:path";
import { StackError } from "@fcalell/cli/errors";

// The pre-build geometry gate over the consumer's `src/` tree, with the
// native host list (`View`, `Pressable`, `ScrollView`, `Animated.View`). The
// gate subpath is dynamic-imported so ts-morph loads during `stack build`
// alone, never on config load, `generate`, or `dev`.
export async function runGeometryGate(cwd: string): Promise<void> {
	const { NATIVE_GEOMETRY_HOSTS, scanGeometry } = await import(
		"@fcalell/ui-core/gate"
	);
	const violations = scanGeometry(join(cwd, "src"), NATIVE_GEOMETRY_HOSTS);
	if (violations.length === 0) return;
	const lines = violations.map(({ file, line, kind, token }) =>
		kind === "host"
			? `src/${file}:${line}  class attribute on non-host tag "${token}"`
			: `src/${file}:${line}  "${token}" is not in the geometry vocabulary`,
	);
	throw new StackError(lines.join("\n"), "GEOMETRY_GATE");
}
