import type { Sentence } from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import { PROSE_CODESPAN, textStrong } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "./cn";

// A whole value of code in the room its box leaves: the stem truncates to it
// and the tail stands whole (`valueCut`). The two read as the one value.
const CUT = "flex-row min-w-0";
const STEM = "shrink min-w-0";
const TAIL = "shrink-0";

// A span of code that is a whole title or meta part: one value, cut in its
// middle to keep its start and its end, in the ink of the `role` it stands in.
export function CodeCut(props: { code: string; role: string }) {
	const { stem, tail } = valueCut(props.code);
	return (
		<View accessible accessibilityLabel={props.code} className={CUT}>
			<RNText
				numberOfLines={1}
				className={cn(props.role, PROSE_CODESPAN, STEM)}
			>
				{stem}
			</RNText>
			{tail ? (
				<RNText
					numberOfLines={1}
					className={cn(props.role, PROSE_CODESPAN, TAIL)}
				>
					{tail}
				</RNText>
			) : null}
		</View>
	);
}

// A sentence's runs: words, a `{ strong }` run at strong weight in the meta
// role, a `{ code }` run in the inline code style, which never cuts in its
// middle. A nested Text draws its fill but no radius or padding: React Native
// lays an inline run out as glyphs, never as a box.
export function Runs(props: { runs: Sentence }) {
	return props.runs.map((run, at) => {
		if (typeof run === "string") return run;
		if ("code" in run)
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
				<RNText key={at} className={PROSE_CODESPAN}>
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
