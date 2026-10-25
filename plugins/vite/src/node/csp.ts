// The merge rule of `vite.slots.clientHeaders`: two contributions of one
// header combine only for `Content-Security-Policy`, per directive. Pure, so
// the rule is tested without a graph.

const CSP = "content-security-policy";

// Header names are case-insensitive: the slot compares them folded.
export function headerKey(name: string): string {
	return name.toLowerCase();
}

interface Directive {
	name: string;
	sources: string[];
}

// `name source source…` separated by `;`. A directive name compares
// case-insensitively and keeps its first spelling; an empty segment is
// dropped. A repeated directive inside one policy is ignored by browsers
// after its first, so the first wins here too.
function parse(policy: string): Directive[] {
	const out: Directive[] = [];
	const seen = new Set<string>();
	for (const segment of policy.split(";")) {
		const [name, ...sources] = segment.trim().split(/\s+/);
		if (!name) continue;
		const id = name.toLowerCase();
		if (seen.has(id)) continue;
		seen.add(id);
		out.push({ name, sources });
	}
	return out;
}

const isNone = (source: string) => source.toLowerCase() === "'none'";

// Sources of one directive, unioned in first-seen order. `'none'` means "no
// source": alone it stays, beside real sources it drops.
function unionSources(a: string[], b: string[]): string[] {
	const union: string[] = [];
	for (const source of [...a, ...b]) {
		if (!union.includes(source)) union.push(source);
	}
	const real = union.filter((source) => !isNone(source));
	return real.length > 0 ? real : union;
}

export function mergeCsp(a: string, b: string): string {
	const merged = new Map<string, Directive>();
	for (const directive of [...parse(a), ...parse(b)]) {
		const id = directive.name.toLowerCase();
		const held = merged.get(id);
		merged.set(
			id,
			held === undefined
				? directive
				: {
						name: held.name,
						sources: unionSources(held.sources, directive.sources),
					},
		);
	}
	return [...merged.values()]
		.map((d) => [d.name, ...d.sources].join(" "))
		.join("; ");
}

// The slot's `merge`: a CSP combines, any other header declines (undefined),
// which leaves the duplicate a conflict.
export function mergeClientHeader(
	a: string,
	b: string,
	key: string,
): string | undefined {
	return key === CSP ? mergeCsp(a, b) : undefined;
}
