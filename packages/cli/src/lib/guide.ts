import type { GuideEntry } from "../specs.ts";

export const GUIDE_PATH = ".stack/guide.md";

// The CLI's own pages, beside the plugins' in `cliSlots.guide`.
export const cliGuide: readonly { page: string; trigger: string }[] = [
	{
		page: "provided",
		trigger: "Shaping, scoping or estimating a feature",
	},
	{
		page: "config",
		trigger: "Adding a plugin or changing an option in `stack.config.ts`",
	},
	{
		page: "commands",
		trigger: "Running a `stack` command, or deciding which one a change needs",
	},
	{
		page: "gap",
		trigger:
			"A part the app needs that stack lacks: a component, variant, token, option or procedure feature",
	},
];

// `.stack/guide.md`, which the consumer's `CLAUDE.md` imports: each line a
// trigger and the page's path from the consumer root, grouped by domain in the
// slot's order. Claude Code imports an `@` only at a line start or after
// whitespace; a scoped package's `@` follows `node_modules/`, so no page loads
// until a session opens it.
export function renderGuide(entries: readonly GuideEntry[]): string {
	const domains = new Map<string, string[]>();
	const seen = new Set<string>();
	for (const e of entries) {
		const key = `${e.package}/${e.page}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const lines = domains.get(e.domain) ?? [];
		lines.push(`- ${e.trigger} → node_modules/${e.package}/guide/${e.page}.md`);
		domains.set(e.domain, lines);
	}
	const sections = [...domains].map(
		([domain, lines]) => `## ${domain}\n\n${lines.join("\n")}\n`,
	);
	return [
		"Stack's guide at this project's pin: each line says when to open a page, then the page. Open only the page the step in hand needs.\n",
		...sections,
	].join("\n");
}
