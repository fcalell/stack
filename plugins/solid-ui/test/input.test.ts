import type { InputKind } from "../src/ui/components/input/index.tsx";

// Checked by the package's type-check and never run: a one-time code is an
// `InputOtp`, never an `Input` kind.
export const kinds: InputKind[] = [
	"text",
	"search",
	"secret",
	"source",
	"number",
	"email",
];
// @ts-expect-error `code` is retired for `InputOtp`
export const retired: InputKind = "code";
