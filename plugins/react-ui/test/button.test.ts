import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "@fcalell/ui-core/roster";
import { counted, ENGLISH } from "@fcalell/ui-core/tokens";
import type { ButtonProps } from "../src/ui/components/button/index.tsx";

test("a Button takes a wait, its seconds left, and says them aloud", () => {
	const props: ButtonProps = { label: "Resend code", act: "quiet", wait: 27 };
	assert.equal(props.wait, 27);
	assert.ok(ROSTER.atom.Button?.props.includes("wait"));
	assert.equal(counted(ENGLISH.waitLeft, 27), "27 seconds left");
	assert.equal(counted(ENGLISH.waitLeft, 1), "1 second left");
});
