const IMPORT = "@.stack/guide.md";

// The consumer's `CLAUDE.md` imports the guide's index. A missing file becomes
// the import alone; an existing one gains it at the end unless a line already
// is it. Null leaves the file as it is.
export function claudeMdTemplate(existing: string | null): string | null {
	if (existing === null) return `${IMPORT}\n`;
	if (existing.split("\n").some((line) => line.trim() === IMPORT)) return null;
	const body = existing.trimEnd();
	return body === "" ? `${IMPORT}\n` : `${body}\n\n${IMPORT}\n`;
}
