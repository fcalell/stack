import assert from "node:assert/strict";
import { test } from "node:test";
import { moment as read } from "./moment.ts";

// ICU may part a time from its day period with a narrow no-break space.
const moment = (iso: string, now: Date, lang: string) =>
	read(iso, now, lang).replaceAll("\u202F", " ");

// Times in the reader's own zone, so the days compare as the reader's do.
const now = new Date(2026, 9, 26, 22, 22);
const at = (...parts: [number, number, number, number, number]) =>
	new Date(...parts).toISOString();

test("a moment today reads as its clock time alone", () => {
	assert.equal(moment(at(2026, 9, 26, 14, 0), now, "en-US"), "2:00 PM");
	assert.equal(moment(at(2026, 9, 26, 14, 0), now, "de-DE"), "14:00");
});

test("a moment hours away, past midnight, reads as tomorrow and its time", () => {
	assert.equal(
		moment(at(2026, 9, 27, 1, 22), now, "en-US"),
		"tomorrow 1:22 AM",
	);
});

test("a moment the day before reads as yesterday and its time", () => {
	assert.equal(
		moment(at(2026, 9, 25, 9, 5), now, "en-US"),
		"yesterday 9:05 AM",
	);
});

test("a moment this year reads its date and time without the year", () => {
	assert.equal(moment(at(2026, 10, 3, 9, 5), now, "en-US"), "Nov 3, 9:05 AM");
});

test("a moment in another year reads its year", () => {
	assert.equal(
		moment(at(2027, 0, 3, 9, 5), now, "en-US"),
		"Jan 3, 2027, 9:05 AM",
	);
});

test("a moment that does not parse reads as itself", () => {
	assert.equal(moment("soon", now, "en-US"), "soon");
});
