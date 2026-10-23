// The reading of a markdown text, free of any framework: both platforms' `Prose` draw from it.

import type { Token, Tokens } from "marked";

// A link's target, unless its scheme runs script.
export function safeHref(href: string): string | undefined {
	const scheme = href.replaceAll(/\s/g, "").toLowerCase();
	return /^(?:javascript|vbscript|data):/.test(scheme) ? undefined : href;
}

// Each token keyed by its source under its parent's key, disambiguated when
// two siblings read the same.
export function keyed<T extends { raw?: string }>(
	tokens: readonly T[],
	parent: string,
): Array<[T, string]> {
	const seen = new Map<string, number>();
	return tokens.map((token) => {
		const base = `${parent}/${token.raw ?? ""}`;
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		return [token, count === 0 ? base : `${base}#${count}`];
	});
}

// A headed part: its heading a pair over the blocks it heads.
export interface Part {
	heading?: Tokens.Heading;
	key: string;
	blocks: Token[];
	parts: Part[];
}

// The document as parts: a top heading (`#`, `##`) opens a part at the
// root; a deeper one opens a part inside the top part's blocks, where it
// stands among them in order.
export function parts(tokens: readonly Token[]): Part {
	const root: Part = { key: "root", blocks: [], parts: [] };
	let top: Part | undefined;
	let deep: Part | undefined;
	for (const [token, key] of keyed(tokens, "b")) {
		if (token.type === "space") continue;
		if (token.type === "heading") {
			const heading = token as Tokens.Heading;
			const part: Part = { heading, key, blocks: [], parts: [] };
			if (heading.depth <= 2) {
				root.parts.push(part);
				top = part;
				deep = undefined;
				continue;
			}
			// A deeper part stands among its holder's blocks, by a marker token.
			const holder = top ?? root;
			holder.parts.push(part);
			holder.blocks.push({ type: "part", raw: key } as Tokens.Generic);
			deep = part;
			continue;
		}
		(deep ?? top ?? root).blocks.push(token);
	}
	return root;
}
