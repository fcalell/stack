import { LOCK_GLYPH, ROW_MARKS, text } from "@fcalell/ui-core/variants";
import { Pressable, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { open as follow } from "../../lib/navigate";
import { clipWhen, Painted, PaintText } from "../../lib/paint";
import { useWords } from "../../lib/words";
import { IconBase } from "../icon";

const LOCK = "flex-row items-center";
// A labelled lock gives way to its line, its reason truncating before its glyph.
const LABELLED = "shrink min-w-icon-meta";
const LABEL = "shrink min-w-0";

// The row's one lock: the meta glyph named by its reason (Locked where a
// table's cell has none), and with `labelled` the reason beside it, as a row's
// meta line has it; a link to what holds the fact with an `href`, inert
// without one. `painted` is its box and a phrase's filler while the row's lock
// is not here. A link stands above the row's hit and takes the press. Outside
// the package's exports.
export function LockMark(props: {
	reason?: string;
	href?: string;
	labelled?: boolean;
	painted?: boolean;
}) {
	const words = useWords();
	const { href, labelled = false, painted } = props;
	const name = props.reason ?? words.locked;
	const face = (
		<>
			<Ink.Provider value="ink-meta">
				<IconBase name="Lock" fit="meta" stroke="line" painted={painted} />
			</Ink.Provider>
			{labelled ? (
				<PaintText
					fills="phrase"
					painted={painted}
					numberOfLines={1}
					{...clipWhen(painted)}
					className={cn(text({ role: "meta" }), LABEL)}
				>
					{painted ? <Painted role="phrase" /> : name}
				</PaintText>
			) : null}
		</>
	);
	const form = cn(LOCK, labelled ? cn(ROW_MARKS, LABELLED) : LOCK_GLYPH);
	if (href === undefined || painted)
		return (
			<View
				pointerEvents="none"
				accessible={!labelled}
				accessibilityLabel={labelled ? undefined : name}
				className={form}
			>
				{face}
			</View>
		);
	return (
		<Pressable
			accessibilityRole="link"
			accessibilityLabel={name}
			onPress={() => follow(href)}
			className={form}
		>
			{face}
		</Pressable>
	);
}
