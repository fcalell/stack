import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "@fcalell/ui-core/roster";
import type { ButtonProps } from "../src/ui/components/button/index";

test("a Button takes a wait, its seconds left", () => {
	const props: ButtonProps = { label: "Resend code", act: "quiet", wait: 27 };
	assert.equal(props.wait, 27);
	assert.ok(ROSTER.atom.Button?.props.includes("wait"));
});
