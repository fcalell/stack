import { text, textStrong } from "@fcalell/ui-core/variants";
import { lexer, type Token, type Tokens } from "marked";
import type { ReactNode } from "react";
import { Linking, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";
import { Code } from "../code";

export interface ProseProps extends Closed {
	markdown: string;
	loading?: boolean;
}

function safeUrl(href: string): string | undefined {
	const scheme = href.replaceAll(/\s/g, "").toLowerCase();
	return /^(?:javascript|vbscript|data):/.test(scheme) ? undefined : href;
}

function inline(tokens: Token[] | undefined, key = "i"): ReactNode[] {
	return (tokens ?? []).map((token, index) => {
		const id = `${key}${index}`;
		switch (token.type) {
			case "strong":
				return (
					<RNText key={id} className={textStrong({ role: "body" })}>
						{inline((token as Tokens.Strong).tokens, id)}
					</RNText>
				);
			case "em":
				return (
					<RNText key={id} className="italic">
						{inline((token as Tokens.Em).tokens, id)}
					</RNText>
				);
			case "codespan":
				return (
					<RNText key={id} className={cn(text({ role: "mono" }), "bg-group")}>
						{(token as Tokens.Codespan).text}
					</RNText>
				);
			case "link": {
				const link = token as Tokens.Link;
				const href = safeUrl(link.href);
				return (
					<RNText
						key={id}
						accessibilityRole={href ? "link" : undefined}
						className={cn(href && "text-tint underline")}
						onPress={href ? () => Linking.openURL(href) : undefined}
					>
						{inline(link.tokens, id)}
					</RNText>
				);
			}
			case "br":
				return "\n";
			case "del":
				return (
					<RNText key={id} className="line-through">
						{inline((token as Tokens.Del).tokens, id)}
					</RNText>
				);
			case "escape":
			case "text":
				return (token as Tokens.Text).tokens
					? inline((token as Tokens.Text).tokens, id)
					: (token as Tokens.Text).text;
			default:
				return "raw" in token ? String(token.raw) : null;
		}
	});
}

// A token's key is its raw text under its parent's key, disambiguated when
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

function block(token: Token, key: string): ReactNode {
	switch (token.type) {
		case "heading":
			return (
				<RNText key={key} className={text({ role: "heading" })}>
					{inline((token as Tokens.Heading).tokens, key)}
				</RNText>
			);
		case "paragraph":
			return (
				<RNText key={key} className={text({ role: "body" })}>
					{inline((token as Tokens.Paragraph).tokens, key)}
				</RNText>
			);
		case "code":
			return <Code key={key} text={(token as Tokens.Code).text} />;
		case "blockquote":
			return (
				<View key={key} className="border-l-2 border-edge pl-stack">
					{(token as Tokens.Blockquote).tokens.map((child, index) =>
						block(child, `${key}q${index}`),
					)}
				</View>
			);
		case "list": {
			const list = token as Tokens.List;
			return (
				<View key={key} className="gap-pair">
					{keyed(list.items, key).map(([item, itemKey], position) => (
						<View key={itemKey} className="flex-row gap-row">
							<RNText className={text({ role: "body" })}>
								{list.ordered
									? `${(Number(list.start) || 1) + position}.`
									: "•"}
							</RNText>
							<View className="flex-1 gap-pair">
								{keyed(item.tokens, itemKey).map(([child, childKey]) =>
									child.type === "text" ? (
										<RNText key={childKey} className={text({ role: "body" })}>
											{inline((child as Tokens.Text).tokens, childKey)}
										</RNText>
									) : (
										block(child, childKey)
									),
								)}
							</View>
						</View>
					))}
				</View>
			);
		}
		case "hr":
			return <View key={key} className="border-t border-edge" />;
		case "space":
			return null;
		default:
			return (
				<RNText key={key} className={text({ role: "body" })}>
					{"raw" in token ? String(token.raw) : ""}
				</RNText>
			);
	}
}

// Rendered markdown at `body`, measured by its column; code fences as Code.
// Raw HTML is never interpreted: it reaches the screen as its own text.
export function Prose({ markdown, loading }: ProseProps) {
	if (loading) return <LoadingRows />;
	const tokens = lexer(markdown);
	return (
		<View className="gap-stack">
			{keyed(tokens, "b").map(([token, tokenKey]) => block(token, tokenKey))}
		</View>
	);
}
