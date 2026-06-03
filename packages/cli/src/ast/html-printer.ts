import { readFile } from "node:fs/promises";
import { HTMLElement, parse, TextNode } from "node-html-parser";
import type { HtmlDocument, HtmlInjection } from "#ast/specs";

// Tags that must not be void-closed in HTML5 output.
const BLOCK_ELEMENT_TAGS: Record<string, boolean> = {
	script: true,
	title: true,
};

// ── Untrusted-string boundary ───────────────────────────────────────
// The printer is the trust boundary for codegen output. Every value
// reaching this file should be assumed attacker-controlled (titles,
// descriptions, html-attr values, all flow from `stack.config.ts`,
// which itself reads from any source the consumer wires up).
//
// Policy (per OWASP "HTML5 Security Cheat Sheet" + WHATWG escape rules):
//
//  - Attribute values: encode `&` `<` `>` `"` `'` as named/numeric
//    entities. We always emit double-quoted attributes, so single
//    quotes don't *need* escaping inside them — but encoding both
//    quote forms keeps the output safe if we ever switch quote style
//    and removes a class of footgun where attacker-controlled content
//    coincidentally contains the host's quote char.
//
//  - Text content of normal elements (&, <, > only — quotes are not
//    special in HTML body context).
//
//  - Text content of RCDATA elements (`<title>`, `<textarea>`): the
//    only special sequences are `&` and the matching close tag. We
//    escape `&` `<` `>` to be defensive — the result still parses
//    identically and is robust if node-html-parser's serializer
//    behavior changes.
//
// We never round-trip values through a serializer that might decode
// them — node-html-parser's TextNode.toString() returns rawText as-is,
// so storing already-escaped text is the canonical pattern.

const ATTR_ESCAPE_RE = /[&<>"']/g;
const ATTR_ESCAPE_MAP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#x27;",
};

function escapeAttr(value: string): string {
	return value.replace(ATTR_ESCAPE_RE, (c) => ATTR_ESCAPE_MAP[c] ?? c);
}

const TEXT_ESCAPE_RE = /[&<>]/g;
const TEXT_ESCAPE_MAP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
};

function escapeText(value: string): string {
	return value.replace(TEXT_ESCAPE_RE, (c) => TEXT_ESCAPE_MAP[c] ?? c);
}

function buildElement(
	injection: Exclude<HtmlInjection, { kind: "html-attr" }>,
): HTMLElement {
	switch (injection.kind) {
		case "script": {
			const attrs: Record<string, string> = { src: injection.src };
			if (injection.type) attrs.type = injection.type;
			if (injection.async) attrs.async = "";
			if (injection.defer) attrs.defer = "";
			return new HTMLElement(
				"script",
				{},
				serializeAttrs(attrs),
				undefined,
				undefined,
				undefined,
				{ blockTextElements: BLOCK_ELEMENT_TAGS },
			);
		}
		case "link": {
			const attrs: Record<string, string> = {
				rel: injection.rel,
				href: injection.href,
			};
			if (injection.as) attrs.as = injection.as;
			if (injection.crossorigin !== undefined) {
				attrs.crossorigin = injection.crossorigin;
			}
			return new HTMLElement("link", {}, serializeAttrs(attrs));
		}
		case "meta": {
			const attrs: Record<string, string> = {};
			if (injection.name) attrs.name = injection.name;
			if (injection.property) attrs.property = injection.property;
			attrs.content = injection.content;
			return new HTMLElement("meta", {}, serializeAttrs(attrs));
		}
		case "title": {
			const el = new HTMLElement(
				"title",
				{},
				"",
				undefined,
				undefined,
				undefined,
				{ blockTextElements: BLOCK_ELEMENT_TAGS },
			);
			// node-html-parser's TextNode is rawText-only — `toString()`
			// returns the value verbatim with no encoding. Pre-escape
			// here so a title value containing `</title>` or `&` can't
			// break out of RCDATA.
			el.childNodes = [new TextNode(escapeText(injection.value), el)];
			return el;
		}
	}
}

function serializeAttrs(attrs: Record<string, string>): string {
	const parts: string[] = [];
	for (const [key, value] of Object.entries(attrs)) {
		if (value === "") {
			parts.push(key);
		} else {
			parts.push(`${key}="${escapeAttr(value)}"`);
		}
	}
	return parts.join(" ");
}

// Mirrors the wording of `SlotConflictError` ("received duplicate key
// 'X' from 'A', 'B'") so plugin authors recognise the failure shape.
function ensureUniqueHtmlAttr(
	seen: Map<string, true>,
	injection: Extract<HtmlInjection, { kind: "html-attr" }>,
): void {
	if (seen.has(injection.name)) {
		throw new Error(
			`HTML <html> received duplicate html-attr '${injection.name}'. ` +
				`Each attribute may be set by at most one contribution.`,
		);
	}
	seen.set(injection.name, true);
}

export async function renderHtml(doc: HtmlDocument): Promise<string> {
	const source = await readFile(doc.shellSource, "utf8");
	const root = parse(source, { comment: true });

	const htmlEl = root.querySelector("html");

	const head = root.querySelector("head");
	if (!head) {
		throw new Error(
			`HTML shell at ${doc.shellSource.toString()} does not contain a <head> element`,
		);
	}

	// Track html-attr names across both head and bodyEnd contributions so
	// duplicate detection survives split contributors.
	const seenHtmlAttrs = new Map<string, true>();

	for (const injection of doc.head) {
		if (injection.kind === "html-attr") {
			if (!htmlEl) {
				throw new Error(
					`HTML shell at ${doc.shellSource.toString()} does not contain an <html> element; cannot apply html-attr "${injection.name}".`,
				);
			}
			ensureUniqueHtmlAttr(seenHtmlAttrs, injection);
			htmlEl.setAttribute(injection.name, escapeAttr(injection.value));
			continue;
		}
		head.appendChild(buildElement(injection));
	}

	if (doc.bodyEnd.length > 0) {
		const body = root.querySelector("body");
		if (!body) {
			throw new Error(
				`HTML shell at ${doc.shellSource.toString()} does not contain a <body> element`,
			);
		}
		for (const injection of doc.bodyEnd) {
			if (injection.kind === "html-attr") {
				if (!htmlEl) {
					throw new Error(
						`HTML shell at ${doc.shellSource.toString()} does not contain an <html> element; cannot apply html-attr "${injection.name}".`,
					);
				}
				ensureUniqueHtmlAttr(seenHtmlAttrs, injection);
				htmlEl.setAttribute(injection.name, escapeAttr(injection.value));
				continue;
			}
			body.appendChild(buildElement(injection));
		}
	}

	return root.toString();
}
