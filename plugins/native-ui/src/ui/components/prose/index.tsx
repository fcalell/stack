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
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Code } from "../code";
import { Link } from "../link";

const COLUMN = "min-w-0";
const ITEM = "flex-row";
const BULLET = "shrink-0 text-center";
const ORDINAL = "shrink-0 text-right";
const ITEM_BODY = "flex-1 min-w-0";
// A quote's text reads in the meta ink.
const QUOTED = "text-ink-meta";
// A line of the body role: a zero-width strut sets its height, the bar
// centred on it.
const LINE = "flex-row items-center";
const STRUT = "​";
// The loading paragraphs' lines, each bar at the length of the line it
// stands in for; the phone's column wraps the second paragraph once more.
const BARS = [
	["w-full", "w-full", "w-1/4"],
	["w-full", "w-full", "w-1/2"],
] as const;

export interface ProseProps extends Closed {
	// The text, in markdown: headings, paragraphs, lists, quotes, rules,
	// inline code, links and fenced code.
	markdown: string;
	// The text waits: two paragraphs of line boxes stand in for it.
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

// A run is a Text nested in its paragraph's, so it takes the paragraph's
// role and ink as the web's inline runs do.
function run(token: Token, key: string): ReactNode {
	switch (token.type) {
		case "strong":
			return (
				<RNText key={key} className={textStrong({ role: "body" })}>
					{inline((token as Tokens.Strong).tokens, key)}
				</RNText>
			);
		case "em":
			return (
				<RNText key={key} className={PROSE_EMPHASIS}>
					{inline((token as Tokens.Em).tokens, key)}
				</RNText>
			);
		case "del":
			return (
				<RNText key={key} className={PROSE_STRIKE}>
					{inline((token as Tokens.Del).tokens, key)}
				</RNText>
			);
		// A nested Text draws its fill but no radius or padding: React Native
		// lays an inline run out as glyphs, never as a box.
		case "codespan":
			return (
				<RNText key={key} className={PROSE_CODESPAN}>
					{(token as Tokens.Codespan).text}
				</RNText>
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
			return "\n";
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
		<RNText className={cn(text({ role: "body" }), props.quoted && QUOTED)}>
			{inline(props.tokens, props.id)}
		</RNText>
	);
}

function List(props: { list: Tokens.List; quoted: boolean; id: string }) {
	const { list, quoted, id } = props;
	const kind = list.ordered ? "ordered" : "bullet";
	const first = typeof list.start === "number" ? list.start : 1;
	return (
		<View accessibilityRole="list" className={PROSE_LIST}>
			{keyed(list.items, id).map(([item, key], index) => (
				<View key={key} className={cn(PROSE_ITEM, ITEM)}>
					<RNText
						className={cn(
							proseMarker({ list: kind }),
							list.ordered ? ORDINAL : BULLET,
						)}
					>
						{list.ordered ? `${first + index}.` : "•"}
					</RNText>
					<View className={cn(PROSE_LIST, ITEM_BODY)}>
						{blocks(item.tokens, quoted, key)}
					</View>
				</View>
			))}
		</View>
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
					<View key={key} className={PROSE_QUOTE}>
						{blocks((token as Tokens.Blockquote).tokens, true, key)}
					</View>
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
				return <View key={key} className={PROSE_RULE} />;
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

function Blocks({ part }: { part: Part }) {
	const nested = new Map(part.parts.map((each) => [each.key, each]));
	return (
		<View className={PROSE_BLOCKS}>
			{keyed(part.blocks, part.key).map(([token, key]) => {
				const held = token.type === "part" ? nested.get(token.raw) : undefined;
				return held ? (
					<Headed key={key} part={held} />
				) : (
					blocks([token], false, key)
				);
			})}
		</View>
	);
}

function Headed({ part }: { part: Part }) {
	const top = (part.heading?.depth ?? 1) <= 2;
	return (
		<View className={PROSE_PART}>
			<RNText
				accessibilityRole="header"
				className={
					top
						? text({ role: "heading" })
						: cn(text({ role: "body" }), textStrong({ role: "body" }))
				}
			>
				{inline(part.heading?.tokens, part.key)}
			</RNText>
			<Blocks part={part} />
		</View>
	);
}

// Markdown at the body role, its column at the measure: `#` and `##` head
// its parts a sections gap apart at the heading role, `###` and deeper head a
// part inside them at body 500; paragraphs, lists (the marker in its own
// slot), quotes and rules a fields gap apart; inline code on the neutral
// fill; a fenced block is a `Code` with its copy act. Raw HTML reads as its
// own text; tables, task lists and images draw as text. A heading is a
// header to the screen reader, which has no heading levels on the phone.
export function Prose({ markdown, loading }: ProseProps) {
	if (loading)
		return (
			<View accessibilityState={{ busy: true }} className={cn(PROSE, COLUMN)}>
				<View className={PROSE_BLOCKS}>
					{BARS.map((paragraph, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs are fixed stand-ins
						<View key={index}>
							{paragraph.map((width, line) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
								<View key={line} className={LINE}>
									<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
									<View className={cn(skeleton({ kind: "line" }), width)} />
								</View>
							))}
						</View>
					))}
				</View>
			</View>
		);
	const root = parts(lexer(markdown));
	return (
		<View className={cn(PROSE, COLUMN)}>
			{root.blocks.length > 0 ? <Blocks part={root} /> : null}
			{root.parts
				.filter((part) => (part.heading?.depth ?? 1) <= 2)
				.map((part) => (
					<Headed key={part.key} part={part} />
				))}
		</View>
	);
}
