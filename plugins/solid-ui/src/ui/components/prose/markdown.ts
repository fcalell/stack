import { Marked } from "marked";

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

// marked's own cleanUrl only URI-encodes; protocol filtering was removed
// upstream, so unsafe schemes must be rejected here. Browsers strip
// tab/newline/CR before resolving a URL ("java\nscript:" still executes),
// so whitespace is stripped before matching the scheme.
function safeUrl(href: string): string | null {
	const scheme = href.replaceAll(/\s/g, "").toLowerCase();
	if (/^(?:javascript|vbscript|data):/.test(scheme)) return null;
	try {
		return encodeURI(href).replaceAll("%25", "%");
	} catch {
		return null;
	}
}

const marked = new Marked({
	renderer: {
		// Raw HTML in the source is escaped, never passed through.
		html({ text }) {
			return escapeHtml(text);
		},
		link(token) {
			const text = this.parser.parseInline(token.tokens);
			const href = safeUrl(token.href);
			if (href === null) return text;
			const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
			return `<a href="${href}"${title} target="_blank" rel="noopener noreferrer">${text}</a>`;
		},
		image(token) {
			const src = safeUrl(token.href);
			if (src === null) return escapeHtml(token.text);
			const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
			return `<img src="${src}" alt="${escapeHtml(token.text)}"${title}>`;
		},
	},
});

export function renderMarkdown(markdown: string): string {
	// Streamed text arrives as growing prefixes; a parser failure must
	// degrade to escaped plain text, never crash the render.
	try {
		return marked.parse(markdown, { async: false });
	} catch {
		return `<p>${escapeHtml(markdown)}</p>`;
	}
}
