import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const COMPONENTS = join(import.meta.dirname, "../src/ui/components");
const HOLDERS = [
	"button/index.tsx",
	"action-bar/index.tsx",
	"sheet/base.tsx",
	"section/index.tsx",
	"banner/index.tsx",
	"pending-bar/index.tsx",
];

test("no blocked act or reason host resets a press in an effect", () => {
	const resetting = HOLDERS.filter((file) => {
		const source = readFileSync(join(COMPONENTS, file), "utf8");
		const effects =
			source.match(/use(?:Layout)?Effect\(\(\) => \{[\s\S]*?\n\t\}, \[/g) ?? [];
		return effects.some((effect) => /setPress/.test(effect));
	});
	assert.deepEqual(resetting, []);
});
