import type { Part } from "@fcalell/ui-core/descriptors";

// A quoted part in a `meta` line is cut at 40 characters; in a title it wraps
// to two lines instead, so a title passes no cut.
export const META_CUT = 40;

export function partText(part: Part, cut?: number): string {
	if (typeof part === "string") return part;
	const inner =
		cut !== undefined && part.quoted.length > cut
			? `${part.quoted.slice(0, cut - 1)}…`
			: part.quoted;
	return `“${inner}”`;
}

// Parts joined by a middle dot.
export function joinParts(parts: readonly Part[], cut?: number): string {
	return parts.map((part) => partText(part, cut)).join(" · ");
}

// A text the meta line truncates as one.
export interface PartRun {
	quoted: boolean;
	text: string;
}

// The later parts as the runs the meta line cuts apart: a `Quoted` part stands
// alone, so it can yield ahead of the plain parts, and the plain parts between
// quotes join.
export function partRuns(parts: readonly Part[], cut?: number): PartRun[] {
	const runs: PartRun[] = [];
	let plain: Part[] = [];
	const flush = () => {
		if (plain.length) runs.push({ quoted: false, text: joinParts(plain) });
		plain = [];
	};
	for (const part of parts) {
		if (typeof part === "string") {
			plain.push(part);
			continue;
		}
		flush();
		runs.push({ quoted: true, text: partText(part, cut) });
	}
	flush();
	return runs;
}
