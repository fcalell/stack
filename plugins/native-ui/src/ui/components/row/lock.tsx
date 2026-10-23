import { LOCK_GLYPH } from "@fcalell/ui-core/variants";
import { Pressable, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { open as follow } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { IconBase } from "../icon";

const LOCK = "flex-row items-center";

// The row's one lock: the meta glyph named by its reason (Locked where a
// table's cell has none), a link to what holds the fact with an `href`, inert
// without one; `painted` is its box while the row's lock is not here. A link
// stands above the row's hit and takes the press the marks' group does not.
// Outside the package's exports.
export function LockMark(props: {
	reason?: string;
	href?: string;
	painted?: boolean;
}) {
	const words = useWords();
	const { href, painted } = props;
	const name = props.reason ?? words.locked;
	const glyph = (
		<Ink.Provider value="ink-meta">
			<IconBase name="Lock" fit="meta" stroke="line" painted={painted} />
		</Ink.Provider>
	);
	if (href === undefined || painted)
		return (
			<View
				accessible
				accessibilityLabel={name}
				className={cn(LOCK_GLYPH, LOCK)}
			>
				{glyph}
			</View>
		);
	return (
		<Pressable
			accessibilityRole="link"
			accessibilityLabel={name}
			onPress={() => follow(href)}
			className={cn(LOCK_GLYPH, LOCK)}
		>
			{glyph}
		</Pressable>
	);
}
