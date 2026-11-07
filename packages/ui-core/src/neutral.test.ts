import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

const ROOT = new URL("../../../", import.meta.url).pathname;
const SKIP = new Set(["node_modules", "dist", ".stack"]);
const SELF = new URL(import.meta.url).pathname;

// Words that belong to a consumer, not to the stack: its product, its
// packages, its hosts, its domain and its work-stream ids.
const CONSUMER_WORDS: RegExp[] = [
	/\bStead\b/i,
	/lead-mail/,
	/tail1a2b|tail1\.ts\.net/,
	/sailward/,
	/mail-digest|Mail digest/,
	/stead-fx/,
	/@stead\//,
	/\/var\/lib\/stead/,
	/trackvault/,
	/calculated metrics/i,
	/marketing channels/i,
	/\bga4\b/i,
	/by voice/,
	/carbon_monoxide/,
	/\bWS\d/,
];

function children(dir: string): string[] {
	try {
		return readdirSync(dir);
	} catch {
		return [];
	}
}

function files(dir: string, out: string[] = []): string[] {
	for (const name of children(dir)) {
		if (SKIP.has(name)) continue;
		const path = join(dir, name);
		if (path === SELF) continue;
		if (statSync(path).isDirectory()) files(path, out);
		else if (/\.(tsx?|mts|cts|mjs|js|json|md|css|html|txt|ya?ml)$/.test(name))
			out.push(path);
	}
	return out;
}

function roots(): string[] {
	const found: string[] = [];
	for (const group of ["packages", "plugins"]) {
		for (const pkg of children(join(ROOT, group))) {
			const subs =
				group === "packages" ? ["src", "guide"] : ["src", "guide", "templates"];
			for (const sub of subs) found.push(join(ROOT, group, pkg, sub));
		}
	}
	for (const app of children(join(ROOT, "apps")))
		found.push(join(ROOT, "apps", app, "src"));
	found.push(join(ROOT, "docs"));
	return found;
}

test("no consumer's names in stack's sources, guides or docs", () => {
	const hits: string[] = [];
	for (const root of roots()) {
		for (const file of files(root)) {
			const lines = readFileSync(file, "utf8").split("\n");
			lines.forEach((line, i) => {
				for (const word of CONSUMER_WORDS)
					if (word.test(line))
						hits.push(`${relative(ROOT, file)}:${i + 1} ${word}`);
			});
		}
	}
	assert.deepEqual(hits, []);
});
