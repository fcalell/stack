import type { PickedFile } from "./descriptors.ts";
import { formatterFor } from "./format.ts";
import type { Words } from "./tokens.ts";

// A file control's `accept` entries: a MIME type (`text/csv`), a MIME family
// (`image/*`) or an extension with its dot (`.har`). A file matches when any
// entry does; no entries accept every file. The web's file dialog narrows
// itself by `accept`, but a dropped file and the phone's document picker
// (which names MIME types alone) can still bring any, so the control checks
// every file it is handed.
export function accepts(
	file: Pick<PickedFile, "name" | "type">,
	accept: readonly string[],
): boolean {
	if (accept.length === 0) return true;
	const name = file.name.toLowerCase();
	const type = file.type.toLowerCase();
	return accept.some((entry) => {
		const want = entry.trim().toLowerCase();
		if (want.startsWith(".")) return name.endsWith(want);
		if (want.endsWith("/*")) return type.startsWith(want.slice(0, -1));
		return type === want;
	});
}

// The kinds whose usual name is not their letters in capitals.
const KIND_NAMES: Record<string, string> = { webp: "WebP" };
const kindName = (letters: string) =>
	KIND_NAMES[letters] ?? letters.toUpperCase();

// The kinds an `accept` list names, in the viewer's words: a MIME family
// (`image/*`) by its word, an extension (`.har`) or a MIME type (`text/csv`)
// by its letters, the type's last dotted or `+` part, so a type and its
// extension name one kind.
export function kindsOf(
	accept: readonly string[],
	words: Pick<Words, "imageFiles" | "audioFiles" | "videoFiles" | "textFiles">,
): string[] {
	const families: Record<string, string> = {
		image: words.imageFiles,
		audio: words.audioFiles,
		video: words.videoFiles,
		text: words.textFiles,
	};
	const kinds = accept.map((entry) => {
		const want = entry.trim().toLowerCase();
		if (want.startsWith(".")) return kindName(want.slice(1));
		const [family = "", subtype = ""] = want.split("/");
		if (subtype === "*") return families[family] ?? family;
		const named = subtype.replace(/^x-/, "").split(/[.+]/).at(-1) ?? subtype;
		return kindName(named);
	});
	return [...new Set(kinds)];
}

// What the phone's document picker is asked for: the MIME types when `accept`
// names nothing else, and every type otherwise, since the system picker
// filters by MIME type alone and an extension would hide files it matches.
export function pickerTypes(accept: readonly string[]): string[] {
	const types = accept.map((entry) => entry.trim());
	return types.length === 0 || types.some((entry) => entry.startsWith("."))
		? ["*/*"]
		: types;
}

// A file's size in the viewer's language: whole bytes below a thousand
// ("39 bytes"), then kilobytes, megabytes and gigabytes at one decimal below
// ten ("9.1 kB", "12 kB"). Both platforms read it, so one file reads the same.
const SIZE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
export function fileSize(bytes: number, lang?: string): string {
	let value = Math.max(0, bytes);
	let at = 0;
	// 999.5 and above would round to 1000 in its own unit.
	while (at < SIZE_UNITS.length - 1 && value >= 999.5) {
		value /= 1000;
		at++;
	}
	return formatterFor("number", lang, {
		style: "unit",
		unit: SIZE_UNITS[at],
		unitDisplay: at === 0 ? "long" : "short",
		maximumFractionDigits: at === 0 || value >= 10 ? 0 : 1,
	}).format(value);
}
