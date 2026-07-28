import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
	it("renders markdown structure to html", () => {
		const html = renderMarkdown("## Title\n\nSome **bold** and `code`.");
		expect(html).toContain("<h2>Title</h2>");
		expect(html).toContain("<strong>bold</strong>");
		expect(html).toContain("<code>code</code>");
	});

	it("escapes raw block html instead of passing it through", () => {
		const html = renderMarkdown('<script>alert("x")</script>');
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("escapes raw inline html inside a paragraph", () => {
		const html = renderMarkdown("hello <img src=x onerror=alert(1)> world");
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
	});

	it("drops unsafe link schemes but keeps the link text", () => {
		const html = renderMarkdown("[click](javascript:alert(1))");
		expect(html).not.toContain("javascript:");
		expect(html).toContain("click");
	});

	it("drops unsafe schemes regardless of case", () => {
		const html = renderMarkdown("[click](JaVaScRiPt:alert(1))");
		expect(html).not.toContain("href");
		expect(html).toContain("click");
	});

	it("keeps https links and opens them in a new tab", () => {
		const html = renderMarkdown("[docs](https://example.com)");
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it("never throws on partial streamed markdown", () => {
		const full =
			"# Title\n\nSome **bold text\n\n```ts\nconst x = [1, 2\n```\n\n[link](https://exa";
		for (let i = 0; i <= full.length; i++) {
			expect(typeof renderMarkdown(full.slice(0, i))).toBe("string");
		}
	});
});
