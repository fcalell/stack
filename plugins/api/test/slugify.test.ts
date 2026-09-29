import assert from "node:assert/strict";
import { test } from "node:test";
import { createSlugify, isReservedSlug, slugify } from "../src/lib/slugify.ts";

test("a dot is a word boundary", () => {
	assert.equal(slugify("shop.example.com"), "shop-example-com");
	assert.equal(slugify("Shop Example.com"), "shop-example-com");
});

test("words join with a hyphen, lowercased, punctuation dropped", () => {
	assert.equal(slugify("My Project!"), "my-project");
	assert.equal(slugify("  Café  Déjà-vu "), "cafe-deja-vu");
});

test("a reserved slug is answered, never thrown", () => {
	assert.equal(slugify("Settings"), "settings");
	assert.equal(isReservedSlug(slugify("Settings")), true);
	assert.equal(isReservedSlug("my-project"), false);
});

test("a custom reserved list replaces the default", () => {
	const custom = createSlugify(["billing"]);
	assert.equal(custom.isReserved("billing"), true);
	assert.equal(custom.isReserved("admin"), false);
	assert.equal(custom.slugify("Billing"), "billing");
});
