import assert from "node:assert/strict";
import { test } from "node:test";
import { accepts, kindsOf, pickerTypes } from "../src/file.ts";
import { ENGLISH } from "../src/tokens.ts";

const csv = { name: "Leads.CSV", type: "text/csv" };
const har = { name: "session.har", type: "" };

test("a file matches by MIME type, family or extension", () => {
	assert.equal(accepts(csv, ["text/csv"]), true);
	assert.equal(accepts(csv, ["text/*"]), true);
	assert.equal(accepts(csv, [".csv"]), true);
	assert.equal(accepts(har, [".har"]), true);
	assert.equal(accepts(csv, ["application/json"]), false);
	assert.equal(accepts(csv, ["image/*"]), false);
});

test("any entry is enough, and no entries accept every file", () => {
	assert.equal(accepts(har, ["text/csv", ".har"]), true);
	assert.equal(accepts(har, ["text/csv"]), false);
	assert.equal(accepts(har, []), true);
});

test("matching ignores case and a family needs its slash", () => {
	assert.equal(accepts(csv, ["TEXT/CSV"]), true);
	assert.equal(accepts(har, [".HAR"]), true);
	assert.equal(accepts({ name: "a", type: "textual/x" }, ["text/*"]), false);
	assert.equal(accepts({ name: "csv", type: "" }, [".csv"]), false);
});

test("an accept list names its kinds in words, never a MIME string", () => {
	assert.deepEqual(kindsOf(["text/csv", ".har"], ENGLISH), ["CSV", "HAR"]);
	assert.deepEqual(kindsOf(["image/*", "audio/*", "video/*"], ENGLISH), [
		"Images",
		"Audio",
		"Video",
	]);
	assert.deepEqual(kindsOf(["text/csv", ".CSV"], ENGLISH), ["CSV"]);
	assert.deepEqual(
		kindsOf(
			[
				"application/pdf",
				"application/x-zip",
				"application/vnd.ms-excel",
				"image/svg+xml",
			],
			ENGLISH,
		),
		["PDF", "ZIP", "MS-EXCEL", "XML"],
	);
	assert.deepEqual(kindsOf(["font/*"], ENGLISH), ["font"]);
});

test("the phone's picker is asked for MIME types, or everything beside an extension", () => {
	assert.deepEqual(pickerTypes(["text/csv", "image/*"]), [
		"text/csv",
		"image/*",
	]);
	assert.deepEqual(pickerTypes(["text/csv", ".har"]), ["*/*"]);
	assert.deepEqual(pickerTypes([]), ["*/*"]);
});
