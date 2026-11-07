import { Text } from "../../components/text/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Judged } from "./judged.tsx";

// Code in a sentence at 320: a URL stands whole and one box, and a long command
// in brackets keeps them on its line, cut with an ellipsis where it alone is
// wider than the line.
const CODED = [
	"Type it as ",
	{ code: "ha.lan:8123" },
	" or ",
	{ code: "http://ha.lan:8123" },
	". Compare each fingerprint with what the machine shows (",
	{ code: "ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub" },
	").",
];

// Each cell draws the component in that role, two sentences long so its
// paragraph runs to the measure, which both roles hold at one width. The body
// draws a sentence of code runs under it.
// A long URL, an email or an identifier breaks at its punctuation, never inside
// a word and never leaving a host's top-level name alone: every text under the
// frame is walked letter by letter, and a line that ends between two letters of
// one part, or on a dot with a short last piece alone after it, is a fault.
const LONG_TEXTS = [
	"The site is northwind.atlassian.example.com and its mail goes through reader.one.northwind@mail.example.com.",
	"https://northwind.atlassian.example.com/rest/api/3/project/NORTH-142/versions?expand=issuesstatus",
];
const SEGMENT = /[A-Za-z0-9]/;
function lineFaults(host: Element): string[] {
	const faults: string[] = [];
	for (const p of host.querySelectorAll<HTMLElement>(
		"[data-urls] p, [data-urls] code",
	)) {
		const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const text = node.textContent ?? "";
			const range = document.createRange();
			const tops: number[] = [];
			for (let at = 0; at < text.length; at++) {
				range.setStart(node, at);
				range.setEnd(node, at + 1);
				tops.push(Math.round(range.getBoundingClientRect().top));
			}
			for (let at = 1; at < text.length; at++) {
				if (
					tops[at] === tops[at - 1] ||
					text[at] === " " ||
					text[at - 1] === " "
				)
					continue;
				// A word is a run of letters and digits between separators.
				const word =
					text
						.slice(0, at)
						.split(/[^A-Za-z0-9]/)
						.at(-1) ?? "";
				const tail = text.slice(at).split(/[^A-Za-z0-9]/)[0] ?? "";
				const near = text.slice(Math.max(0, at - 12), at + 12);
				if (SEGMENT.test(text[at - 1] ?? "") && SEGMENT.test(text[at] ?? ""))
					faults.push(
						`a line breaks inside the word ${word}|${tail} (${near})`,
					);
				else if (
					text[at - 1] === "." &&
					/^[a-z]{1,4}($|[^a-z0-9])/.test(text.slice(at))
				)
					faults.push(
						`a line ends on a dot with ${tail} alone after it (${near})`,
					);
			}
		}
	}
	return faults;
}

function Urls() {
	return (
		<div data-urls className="flex flex-col gap-stack">
			{LONG_TEXTS.map((text) => (
				<Text key={text}>{text}</Text>
			))}
			<Text kind="meta">{LONG_TEXTS[0]}</Text>
		</div>
	);
}

export function drawText(frame: ShowcaseFrame) {
	return (
		<Judged name="Text" judge={lineFaults}>
			{drawnText(frame)}
		</Judged>
	);
}

function drawnText(frame: ShowcaseFrame) {
	switch (frame.cell.name) {
		case "TEXT.role.body":
			return (
				<>
					<Text kind="body">
						A primary line, the body of a paragraph. It runs on past one line,
						so the frame shows where the measure ends and the paragraph wraps.
					</Text>
					<Text kind="body">{CODED}</Text>
					<Urls />
				</>
			);
		case "TEXT.role.meta":
			return (
				<Text kind="meta">
					A secondary line that describes the one above. It runs on past one
					line, to the same width as a primary line does.
				</Text>
			);
		default:
			return undefined;
	}
}
