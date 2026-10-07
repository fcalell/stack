import { cn } from "@fcalell/ui-core/cn";
import {
	lineBox,
	PROSE,
	PROSE_BLOCKS,
	PROSE_CODESPAN,
	PROSE_EMPHASIS,
	PROSE_ITEM,
	PROSE_LIST,
	PROSE_PART,
	PROSE_QUOTE,
	PROSE_RULE,
	PROSE_STRIKE,
	proseMarker,
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { lexer, type Token, type Tokens } from "marked";
import { type ReactNode, use, useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { Code } from "../code/index.tsx";
import { Link } from "../link/index.tsx";

// An unbroken token too long for the column (a URL) wraps anywhere; every
// paragraph, item and quote inherits it.
const COLUMN = "flex flex-col min-w-0 wrap-anywhere";
const STACK = "flex flex-col";
const ITEM = "flex";
const BULLET = "shrink-0 text-center";
const ORDINAL = "shrink-0 text-end";
const ITEM_BODY = "flex flex-col grow min-w-0";
// An inline code span is one atom on its line: it moves whole while it fits,
// and only a span wider than the column wraps, inside itself.
const CODESPAN = "inline-block max-w-full";
// A quote's text reads in the meta ink.
const QUOTED = "text-ink-meta";
const LINE = "flex items-center h-lh";
// The touch column wraps the second paragraph's long line once more.
const TOUCH_LINE = "hidden touch:flex items-center h-lh";
// The loading paragraphs' lines, each bar at the length of the line it
// stands in for; the second paragraph's middle line stands on touch alone.
const BARS = [
	[
		["w-full", false],
		["w-full", false],
		["w-1/4", false],
	],
	[
		["w-full", false],
		["w-full", true],
		["w-1/2", false],
	],
] as const;

/** Markdown read at the measure. */
export interface ProseProps extends Closed {
	/** The text, in markdown: headings, paragraphs, lists, quotes, rules, inline code, links and fenced code. */
	markdown: string;
	/** The text waits: two paragraphs of line boxes stand in for it. Unset, a loading `Section` or `Group` around it makes it wait. */
	loading?: boolean;
}

// A link's target, unless its scheme runs script.
function safeHref(href: string): string | undefined {
	const scheme = href.replaceAll(/\s/g, "").toLowerCase();
	return /^(?:javascript|vbscript|data):/.test(scheme) ? undefined : href;
}

// Each token keyed by its source under its parent's key, disambiguated when
// two siblings read the same.
function keyed<T extends { raw?: string }>(
	tokens: readonly T[],
	parent: string,
): Array<[T, string]> {
	const seen = new Map<string, number>();
	return tokens.map((token) => {
		const base = `${parent}/${token.raw ?? ""}`;
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		return [token, count === 0 ? base : `${base}#${count}`];
	});
}

function inline(tokens: readonly Token[] | undefined, parent: string) {
	return keyed(tokens ?? [], parent).map(([token, key]) => run(token, key));
}

function run(token: Token, key: string): ReactNode {
	switch (token.type) {
		case "strong":
			return (
				<strong key={key} className={textStrong({ role: "body" })}>
					{inline((token as Tokens.Strong).tokens, key)}
				</strong>
			);
		case "em":
			return (
				<em key={key} className={PROSE_EMPHASIS}>
					{inline((token as Tokens.Em).tokens, key)}
				</em>
			);
		case "del":
			return (
				<del key={key} className={PROSE_STRIKE}>
					{inline((token as Tokens.Del).tokens, key)}
				</del>
			);
		case "codespan":
			return (
				<code key={key} className={cn(PROSE_CODESPAN, CODESPAN)}>
					{(token as Tokens.Codespan).text}
				</code>
			);
		case "link": {
			const link = token as Tokens.Link;
			const href = safeHref(link.href);
			const words = inline(link.tokens, key);
			return href ? (
				<Link key={key} href={href}>
					{words}
				</Link>
			) : (
				words
			);
		}
		case "br":
			return <br key={key} />;
		case "image":
			return (token as Tokens.Image).text;
		case "text": {
			const words = token as Tokens.Text;
			return words.tokens ? inline(words.tokens, key) : words.text;
		}
		case "escape":
			return (token as Tokens.Escape).text;
		// Raw HTML is never interpreted: it reads as its own text.
		default:
			return token.raw;
	}
}

function Paragraph(props: { tokens?: Token[]; quoted: boolean; id: string }) {
	return (
		<p className={cn(text({ role: "body" }), props.quoted && QUOTED)}>
			{inline(props.tokens, props.id)}
		</p>
	);
}

function List(props: { list: Tokens.List; quoted: boolean; id: string }) {
	const { list, quoted, id } = props;
	const kind = list.ordered ? "ordered" : "bullet";
	const first = typeof list.start === "number" ? list.start : 1;
	const items = keyed(list.items, id).map(([item, key], index) => (
		<li key={key} className={cn(PROSE_ITEM, ITEM)}>
			<span
				aria-hidden
				className={cn(
					proseMarker({ list: kind }),
					list.ordered ? ORDINAL : BULLET,
				)}
			>
				{list.ordered ? `${first + index}.` : "•"}
			</span>
			<div className={cn(PROSE_LIST, ITEM_BODY)}>
				{blocks(item.tokens, quoted, key)}
			</div>
		</li>
	));
	const box = cn(PROSE_LIST, STACK);
	return list.ordered ? (
		<ol className={box} start={first}>
			{items}
		</ol>
	) : (
		<ul className={box}>{items}</ul>
	);
}

function blocks(tokens: readonly Token[], quoted: boolean, parent: string) {
	return keyed(tokens, parent).map(([token, key]) => {
		switch (token.type) {
			case "space":
				return null;
			case "paragraph":
			case "text":
				return (
					<Paragraph
						key={key}
						tokens={(token as Tokens.Paragraph).tokens ?? [token]}
						quoted={quoted}
						id={key}
					/>
				);
			case "code":
				return <Code key={key} text={(token as Tokens.Code).text} copy />;
			case "blockquote":
				return (
					<blockquote key={key} className={cn(PROSE_QUOTE, STACK)}>
						{blocks((token as Tokens.Blockquote).tokens, true, key)}
					</blockquote>
				);
			case "list":
				return (
					<List
						key={key}
						list={token as Tokens.List}
						quoted={quoted}
						id={key}
					/>
				);
			case "hr":
				return <hr key={key} className={PROSE_RULE} />;
			default:
				return (
					<Paragraph
						key={key}
						tokens={[{ type: "text", raw: token.raw, text: token.raw }]}
						quoted={quoted}
						id={key}
					/>
				);
		}
	});
}

// A headed part: its heading a pair over the blocks it heads.
interface Part {
	heading?: Tokens.Heading;
	key: string;
	blocks: Token[];
	parts: Part[];
}

// The document as parts: a top heading (`#`, `##`) opens a part at the
// root; a deeper one opens a part inside the top part's blocks, where it
// stands among them in order.
function parts(tokens: readonly Token[]): Part {
	const root: Part = { key: "root", blocks: [], parts: [] };
	let top: Part | undefined;
	let deep: Part | undefined;
	for (const [token, key] of keyed(tokens, "b")) {
		if (token.type === "space") continue;
		if (token.type === "heading") {
			const heading = token as Tokens.Heading;
			const part: Part = { heading, key, blocks: [], parts: [] };
			if (heading.depth <= 2) {
				root.parts.push(part);
				top = part;
				deep = undefined;
				continue;
			}
			// A deeper part stands among its holder's blocks, by a marker token.
			const holder = top ?? root;
			holder.parts.push(part);
			holder.blocks.push({ type: "part", raw: key } as Tokens.Generic);
			deep = part;
			continue;
		}
		(deep ?? top ?? root).blocks.push(token);
	}
	return root;
}

function Blocks(props: { part: Part; level: number }) {
	const { part } = props;
	const nested = new Map(part.parts.map((each) => [each.key, each]));
	const shown = keyed(part.blocks, part.key).map(([token, key]) => {
		const held = token.type === "part" ? nested.get(token.raw) : undefined;
		return held ? (
			<Headed key={key} part={held} level={props.level} />
		) : (
			blocks([token], false, key)
		);
	});
	return <div className={cn(PROSE_BLOCKS, STACK)}>{shown}</div>;
}

function Headed(props: { part: Part; level: number }) {
	const { part, level } = props;
	const heading = part.heading;
	const top = (heading?.depth ?? 1) <= 2;
	// HTML stops at `h6`.
	const Tag = `h${Math.min(level, 6)}` as "h2";
	return (
		<div className={cn(PROSE_PART, STACK)}>
			<Tag
				className={
					top
						? text({ role: "heading" })
						: cn(text({ role: "body" }), textStrong({ role: "body" }))
				}
			>
				{inline(heading?.tokens, part.key)}
			</Tag>
			<Blocks part={part} level={level + 1} />
		</div>
	);
}

/** Markdown at the body role, its column at the measure: `#` and `##` head its parts a sections gap apart at the heading role, `###` and deeper head a part inside them at body 500; paragraphs, lists (the marker hung in its own slot), quotes and rules a fields gap apart; inline code on the neutral fill; a fenced block is a `Code` with its copy act. Raw HTML reads as its own text; tables, task lists and images draw as text. */
export function Prose({ markdown, loading }: ProseProps) {
	const level = use(HeadingContext);
	const inherited = use(LoadingContext);
	const waiting = loading ?? inherited;
	// The markdown lexes and folds once per text, and not while the prose waits.
	const root = useMemo(
		() => (waiting ? undefined : parts(lexer(markdown))),
		[markdown, waiting],
	);
	if (!root)
		return (
			<div aria-busy className={cn(PROSE, COLUMN)}>
				<div className={cn(PROSE_BLOCKS, STACK)}>
					{BARS.map((paragraph, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs are fixed stand-ins
						<div key={index} className={STACK}>
							{paragraph.map(([width, touch], line) => (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
									key={line}
									className={cn(
										lineBox({ role: "body" }),
										touch ? TOUCH_LINE : LINE,
									)}
								>
									<span className={cn(skeleton({ kind: "line" }), width)} />
								</span>
							))}
						</div>
					))}
				</div>
			</div>
		);
	// Its fenced blocks are `Code` and wait only as the text does.
	return (
		<LoadingContext value={false}>
			<div className={cn(PROSE, COLUMN)}>
				{root.blocks.length > 0 ? <Blocks part={root} level={level} /> : null}
				{root.parts
					.filter((part) => (part.heading?.depth ?? 1) <= 2)
					.map((part) => (
						<Headed key={part.key} part={part} level={level} />
					))}
			</div>
		</LoadingContext>
	);
}
