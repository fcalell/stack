import type { Coded, RowPart, RowTitle } from "@fcalell/ui-core/descriptors";

// A quoted part in a meta line is cut at 40 characters; a title wraps whole.
export const META_CUT = 40;

export function isCoded(part: RowTitle): part is Coded {
	return typeof part === "object" && "code" in part;
}

export function partText(part: RowTitle, cut?: number): string {
	if (typeof part === "string") return part;
	if ("quoted" in part) {
		const inner =
			cut !== undefined && part.quoted.length > cut
				? `${part.quoted.slice(0, cut - 1)}…`
				: part.quoted;
		return `“${inner}”`;
	}
	if ("code" in part) return part.code;
	return part.map((run) => (typeof run === "string" ? run : run.code)).join("");
}

// Parts joined by a middle dot.
export function joinParts(parts: readonly RowPart[], cut?: number): string {
	return parts.map((part) => partText(part, cut)).join(" · ");
}

// Parts as the runs of one text with a middle dot between them, a span of
// code its own run so it draws in the code style.
export function leadRuns(
	parts: readonly RowPart[],
	cut?: number,
): (string | Coded)[] {
	const runs: (string | Coded)[] = [];
	parts.forEach((part, at) => {
		const sep = at === 0 ? "" : " · ";
		if (isCoded(part)) runs.push(sep, part);
		else runs.push(`${sep}${partText(part, cut)}`);
	});
	return runs;
}

// A text the meta line truncates as one.
export interface PartRun {
	kind: "plain" | "quoted" | "code";
	text: string;
}

// The later parts as the runs the meta line cuts apart: a `Quoted` or a
// `Coded` part stands alone, so it can yield ahead of the plain parts, and the
// plain parts between them join.
export function partRuns(parts: readonly RowPart[], cut?: number): PartRun[] {
	const runs: PartRun[] = [];
	let plain: RowPart[] = [];
	const flush = () => {
		if (plain.length) runs.push({ kind: "plain", text: joinParts(plain) });
		plain = [];
	};
	for (const part of parts) {
		if (typeof part === "string") {
			plain.push(part);
			continue;
		}
		flush();
		runs.push({
			kind: isCoded(part) ? "code" : "quoted",
			text: partText(part, cut),
		});
	}
	flush();
	return runs;
}
