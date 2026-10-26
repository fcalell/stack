import { paints } from "@fcalell/plugin-api/read";
import {
	type Datum,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { IconLinkAct, Run } from "@fcalell/ui-core/descriptors";
import { actsSplit } from "@fcalell/ui-core/fold";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import { endedReason } from "@fcalell/ui-core/read";
import {
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TITLE_FLOOR,
	PAGE_TOP_BAR,
	PAGE_TOP_BAR_END,
	PAGE_TOP_BAR_START,
	text,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { View } from "react-native";
import { asIconAct, type IconAct, type MenuEntry } from "../../lib/act";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import { DistanceContext, ShellSwitcher } from "../../lib/frame";
import { navigate } from "../../lib/navigate";
import { inertProps, Painted, PaintText } from "../../lib/paint";
import { partRuns } from "../../lib/parts";
import { BusyMark, endedItems, type Frame, FrameLine } from "../../lib/read";
import type { Route } from "../../lib/route";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButtonBase } from "../button/glyph";
import { MenuBase } from "../menu/base";
import { SwitcherPick } from "../shell/switcher";

// The bar is one line: the back act, the title truncating at its floor (two
// fifths of the row), then the first act at its icon and the more menu holding
// the rest (`actsSplit`), whatever the room.
const TOP_BAR = "relative flex-row items-center";
const ACTS = "shrink-0 flex-row items-center gap-gap ms-auto";
// The title is a row: its text shrinks and truncates, the busy mark after it.
const TITLE = "min-w-0 grow flex-row items-center gap-gap";
const NAME = "shrink";

// A Pane's bar: the back act or the switcher, the title, the actions and more,
// and the line of its read's state. It subscribes to the title and the acts
// itself, so one of those reads landing renders the bar and nothing under the
// Pane's body. Outside the package's exports.
export function PaneHead(props: {
	// What the bar draws: the Pane's title, or the place of a record.
	title: Datum<Run>;
	// Whether it is the screen's header: a record's place is not, its head holds the name.
	heading: boolean;
	back?: Route;
	actions?: readonly Datum<IconAct | IconLinkAct>[];
	more?: Datum<readonly MenuEntry[]>;
	// The Pane's frame, whose busy mark and state line the bar draws.
	frame: Frame;
}) {
	const { title, heading, back, actions, more, frame } = props;
	const words = useWords();
	const [name, overflowAt, ...actionAt] = useSelections([
		title,
		more,
		...(actions ?? []),
	]);
	useDrawsFailure([more, ...(actions ?? [])]);
	const far = useContext(DistanceContext);
	const switcher = useContext(ShellSwitcher);
	const lead =
		back !== undefined ? (
			<Button
				glyph
				icon={BACK_GLYPH}
				label={words.back}
				onAct={() => navigate(back)}
			/>
		) : switcher ? (
			<SwitcherPick switcher={switcher} />
		) : null;
	// An act is painted, inert, while its own datum waits; a selection's shape
	// is unknown until it lands, so its paint is a bare glyph. One whose read
	// ended stands blocked with the sentence for its name, never a false yes.
	const built = actionAt.map((one, at) => {
		if (!one.painted) {
			return <Button glyph key={one.value.label} {...asIconAct(one.value)} />;
		}
		const ended = endedReason(words, one.phase);
		return (
			<IconButtonBase
				// biome-ignore lint/suspicious/noArrayIndexKey: a painted act has no name, and the acts stand in a fixed order
				key={at}
				icon={ended ? "CircleAlert" : "Ellipsis"}
				label={ended ?? ""}
				disabled={ended !== undefined}
				painted={ended === undefined}
			/>
		);
	});
	const overflowEnded = overflowAt.painted
		? endedReason(words, overflowAt.phase)
		: undefined;
	const own = overflowEnded
		? endedItems(words, overflowEnded)
		: overflowAt.painted
			? []
			: (overflowAt.value ?? []);
	const { standing } = actsSplit(built);
	// The acts folded into the menu stand before its own, in their order; one
	// whose read waits has no name yet and one whose read ended stands blocked.
	const folded = actsSplit(actionAt).folded.flatMap(
		(one): readonly MenuEntry[] => {
			if (!one.painted) return [one.value];
			const ended = endedReason(words, one.phase);
			return ended ? endedItems(words, ended) : [];
		},
	);
	const items: readonly MenuEntry[] = [...folded, ...own];
	const overflow = overflowAt.painted || items.length > 0;
	return (
		<View className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM)}>
			<View className={cn(PAGE_TOP_BAR, TOP_BAR)}>
				{lead ? <View className={PAGE_TOP_BAR_START}>{lead}</View> : null}
				<View className={cn(TITLE, PAGE_TITLE_FLOOR)}>
					<PaintText
						fills="title"
						painted={paints(name)}
						accessibilityRole={heading ? "header" : undefined}
						numberOfLines={1}
						{...inertProps(name.painted)}
						className={cn(text({ role: "title" }), NAME)}
					>
						{paints(name) ? (
							<Painted role="title" />
						) : name.painted ? null : (
							<RunText runs={partRuns(name.value)} fit="name" />
						)}
					</PaintText>
					<BusyMark frame={frame} />
				</View>
				<View className={cn(ACTS, PAGE_TOP_BAR_END)}>
					{standing}
					{overflow ? (
						<MenuBase
							label={words.more}
							title={words.more}
							items={items}
							painted={
								overflowAt.painted &&
								overflowEnded === undefined &&
								folded.length === 0
							}
						/>
					) : null}
				</View>
			</View>
			<FrameLine frame={frame} />
		</View>
	);
}
