import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { renderHtml } from "#ast/html-printer";

const SHELL_URL = pathToFileURL(
	new URL("./__fixtures__/shell.html", import.meta.url).pathname,
);

describe("renderHtml", () => {
	it("injects title, meta, and link into <head>", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [
				{ kind: "title", value: "My App" },
				{ kind: "meta", name: "description", content: "My description" },
				{ kind: "link", rel: "icon", href: "/favicon.svg" },
			],
			bodyEnd: [],
		});

		expect(out).toContain("<title>My App</title>");
		expect(out).toContain('<meta name="description" content="My description">');
		expect(out).toContain('<link rel="icon" href="/favicon.svg">');
		// preserves existing shell charset meta
		expect(out).toContain('charset="utf-8"');
	});

	it("injects a meta with property attribute (OpenGraph style)", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [{ kind: "meta", property: "og:title", content: "Hello" }],
			bodyEnd: [],
		});
		expect(out).toContain('<meta property="og:title" content="Hello">');
	});

	it("injects a link with as and crossorigin", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [
				{
					kind: "link",
					rel: "preload",
					href: "/font.woff2",
					as: "font",
					crossorigin: "anonymous",
				},
			],
			bodyEnd: [],
		});
		expect(out).toContain(
			'<link rel="preload" href="/font.woff2" as="font" crossorigin="anonymous">',
		);
	});

	it("injects bodyEnd scripts immediately before </body>", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [],
			bodyEnd: [
				{
					kind: "script",
					src: "/entry.tsx",
					type: "module",
					async: true,
					defer: true,
				},
			],
		});

		const scriptIdx = out.indexOf(
			'<script src="/entry.tsx" type="module" async defer>',
		);
		const closeBody = out.indexOf("</body>");
		expect(scriptIdx).toBeGreaterThan(-1);
		expect(closeBody).toBeGreaterThan(scriptIdx);
		// nothing between the script close and </body> except whitespace
		const between = out.slice(
			out.indexOf("</script>", scriptIdx) + "</script>".length,
			closeBody,
		);
		expect(between.trim()).toBe("");
	});

	it("renders script with no optional attrs", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [],
			bodyEnd: [{ kind: "script", src: "/main.js" }],
		});
		expect(out).toContain('<script src="/main.js"></script>');
	});

	it("escapes attribute values with quotes and ampersands", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [
				{
					kind: "meta",
					name: "description",
					content: 'a "quote" & b',
				},
			],
			bodyEnd: [],
		});
		expect(out).toContain(
			'<meta name="description" content="a &quot;quote&quot; &amp; b">',
		);
	});

	it("escapes the full OWASP attribute set (& \" ' < >)", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [
				{
					kind: "meta",
					name: "description",
					content: `<a href='x' onclick="evil()" attr=&copy>`,
				},
			],
			bodyEnd: [],
		});
		expect(out).toContain(
			'content="&lt;a href=&#x27;x&#x27; onclick=&quot;evil()&quot; attr=&amp;copy&gt;"',
		);
	});

	it("html-attr injection sets attribute on <html>", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [{ kind: "html-attr", name: "data-theme", value: "dark" }],
			bodyEnd: [],
		});
		expect(out).toContain('data-theme="dark"');
	});

	it("escapes html-attr values", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [
				{
					kind: "html-attr",
					name: "data-payload",
					value: "<script>\"&'</script>",
				},
			],
			bodyEnd: [],
		});
		expect(out).toContain(
			'data-payload="&lt;script&gt;&quot;&amp;&#x27;&lt;/script&gt;"',
		);
	});

	it("throws on duplicate html-attr contributions to the same attribute", async () => {
		await expect(
			renderHtml({
				shellSource: SHELL_URL,
				head: [
					{ kind: "html-attr", name: "lang", value: "en" },
					{ kind: "html-attr", name: "lang", value: "fr" },
				],
				bodyEnd: [],
			}),
		).rejects.toThrow(/duplicate html-attr.*['"]lang['"]/);
	});

	it("throws on duplicate html-attr across head and bodyEnd", async () => {
		await expect(
			renderHtml({
				shellSource: SHELL_URL,
				head: [{ kind: "html-attr", name: "data-x", value: "1" }],
				bodyEnd: [{ kind: "html-attr", name: "data-x", value: "2" }],
			}),
		).rejects.toThrow(/duplicate html-attr.*['"]data-x['"]/);
	});

	it("escapes title text content (cannot break out of <title>)", async () => {
		const out = await renderHtml({
			shellSource: SHELL_URL,
			head: [{ kind: "title", value: "evil </title><script>x</script>" }],
			bodyEnd: [],
		});
		// Must NOT contain a literal closing-title-followed-by-script.
		expect(out).not.toContain("</title><script>");
		// `&` and `</title>` close-sequence are the only specials inside RCDATA;
		// we escape both via standard entity encoding.
		expect(out).toMatch(/<title>evil &lt;\/title&gt;.*<\/title>/);
	});

	it("throws when shell lacks a <head>", async () => {
		const noHead = pathToFileURL(
			new URL("./__fixtures__/no-head.html", import.meta.url).pathname,
		);
		await expect(
			renderHtml({ shellSource: noHead, head: [], bodyEnd: [] }),
		).rejects.toThrow();
	});
});
