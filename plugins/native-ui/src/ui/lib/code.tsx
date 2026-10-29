import type { Runs } from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import {
	CODE_NAME,
	PROSE_CODESPAN,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "./cn";

// A whole value of code in the room its box leaves: the stem truncates to it
// and the tail stands whole (`valueCut`). The two read as the one value.
const CUT = "flex-row min-w-0";
const STEM = "shrink min-w-0";
const TAIL = "shrink-0";

// A hyphen binds to the word after it: the platform breaks a line after a
// hyphen, which in code splits a flag (`--` / `bg`) into what reads as two
// words. A word joiner (U+2060) after each hyphen that leads a word takes that
// break away. Only for a text drawn and never selected: the copy act copies
// the source, so the joiner never leaves the screen.
export function codeBound(code: string): string {
	return code.replace(/-(?=\S)/g, "-\u2060");
}

// A span of code that is a whole title or meta part of a row: one value in the
// mono, bare (a machine name in a row is never boxed), cut in its middle to
// keep its start and its end (`valueCut`: a value with a space is words, cut at
// its end), in the ink of the `role` it stands in.
export function CodeCut(props: { code: string; role: string }) {
	const { stem, tail } = valueCut(props.code);
	return (
		<View accessible accessibilityLabel={props.code} className={CUT}>
			<RNText numberOfLines={1} className={cn(props.role, CODE_NAME, STEM)}>
				{stem}
			</RNText>
			{tail ? (
				<RNText numberOfLines={1} className={cn(props.role, CODE_NAME, TAIL)}>
					{tail}
				</RNText>
			) : null}
		</View>
	);
}

// Runs as one text: words, a `{ quoted }` run in typographic quotes, a `{ strong }`
// run at strong weight in the meta role, a `{ code }` run in the mono, which
// never cuts in its middle: in the inline code style inside a sentence (`fit`
// `span`, the default), bare where the runs are a name, a crumb or a row's line
// (`fit` `name`, voice 7). A nested Text draws its fill but no radius or padding: React Native
// lays an inline run out as glyphs, never as a box.
export function RunText(props: { runs: Runs; fit?: "span" | "name" }) {
	const look = props.fit === "name" ? CODE_NAME : PROSE_CODESPAN;
	return props.runs.map((run, at) => {
		if (typeof run === "string") return run;
		if ("quoted" in run) return `“${run.quoted}”`;
		if ("code" in run)
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
				<RNText key={at} className={look}>
					{run.code}
				</RNText>
			);
		return (
			// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
			<RNText key={at} className={textStrong({ role: "meta" })}>
				{run.strong}
			</RNText>
		);
	});
}
