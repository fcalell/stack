// The part of `document.head` the app reads its static title through.
export interface TitledHead {
	querySelectorAll(selectors: "title"): ArrayLike<{
		textContent: string | null;
		remove(): void;
	}>;
}

// Hands the shell's static `<title>` to the head manager. The shell carries
// one so the tab reads right before the app runs; `@solidjs/meta` appends a
// `Title`'s element after it, and a document shows its first `<title>`, so a
// page's `Title` would never show. The static elements go, and their text
// comes back as the app root's own `Title`, the base every page's cascades
// over and returns to.
export function takeStaticTitle(head: TitledHead): string {
	const titles = Array.from(head.querySelectorAll("title"));
	const text = titles[0]?.textContent ?? "";
	for (const title of titles) title.remove();
	return text;
}
