import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { topLevelSegments } from "../src/node/routes.ts";

test("the top-level segments follow TanStack's file convention", () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-react-routes-"));
	const files = [
		"__root.tsx",
		"index.tsx",
		"login.tsx",
		"settings/index.tsx",
		"settings/profile.tsx",
		"billing.index.tsx",
		"$org.tsx",
		"$org/members.tsx",
		"_auth.tsx",
		"_auth/signup.tsx",
		"_auth.reset.tsx",
		"(marketing)/pricing.tsx",
		"posts_.$id.tsx",
		"about.lazy.tsx",
		"-components/card.tsx",
		"help[.]json.ts",
		"styles.css",
	];
	for (const file of files) {
		const path = join(cwd, "src/app/routes", file);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, "");
	}
	assert.deepEqual(topLevelSegments(cwd, "src/app/routes"), [
		"about",
		"billing",
		"help.json",
		"login",
		"posts",
		"pricing",
		"reset",
		"settings",
		"signup",
	]);
});

test("a missing routes directory has no segments", () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-react-routes-"));
	assert.deepEqual(topLevelSegments(cwd, "src/app/routes"), []);
});
