// What a control derives from its value: a text area's word count and a checkbox's state name; both platforms' controls draw from it.

/** The words in a text, split on whitespace. */
export function wordCount(value: string): number {
	return value.split(/\s+/).filter(Boolean).length;
}

/** A checkbox's state name by its value. */
export const STATES = {
	true: "checked",
	false: "unchecked",
	mixed: "mixed",
} as const;
