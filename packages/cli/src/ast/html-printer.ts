import { readFile } from "node:fs/promises";
import { HTMLElement, parse } from "node-html-parser";
import type { HtmlDocument, HtmlInjection } from "#ast/specs";

// Tags that must not be void-closed in HTML5 output.
const BLOCK_ELEMENT_TAGS: Record<string, boolean> = {
	script: true,
	title: true,
};

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
			el.textContent = injection.value;
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

function escapeAttr(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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
	for (const injection of doc.head) {
		if (injection.kind === "html-attr") {
			if (!htmlEl) {
				throw new Error(
					`HTML shell at ${doc.shellSource.toString()} does not contain an <html> element; cannot apply html-attr "${injection.name}".`,
				);
			}
			htmlEl.setAttribute(injection.name, injection.value);
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
				htmlEl.setAttribute(injection.name, injection.value);
				continue;
			}
			body.appendChild(buildElement(injection));
		}
	}

	return root.toString();
}
