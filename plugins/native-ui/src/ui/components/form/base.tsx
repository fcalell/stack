import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import {
	CARD,
	FORM_FOOT,
	GROUP_ITEM,
	LIST_BAND,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Acting } from "../../lib/act";
import { useArrivals } from "../../lib/arrive";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import type { Empty } from "../../lib/empty";
import { between } from "../../lib/group";
import { useLeaveGuard } from "../../lib/leave";
import { blockIn, FadingView } from "../../lib/motion";
import {
	BusyMark,
	FrameBody,
	FrameLine,
	submitOf,
	useFrame,
} from "../../lib/read";
import { TouchedContext, useTouched, useTouchState } from "../../lib/touched";
import { useWords } from "../../lib/words";
import type { ActionBarProps } from "../action-bar";
import { ActionBarBase } from "../action-bar/base";
import { Text } from "../text";

// The form is its rows over its foot. Its fields are a run the form does not
// index (structure rule 9), so they abut with no hairline between them, as a
// labelled rows do; the hairline falls between its groups, which are
// data.
const ROWS = "min-w-0";
// A group's band: the title line over the description.
const BAND = "min-w-0";
// The legend is a row, the busy mark after its title.
const LEGEND = "flex-row items-center gap-gap";

// One group of fields a `Form` draws, titled.
export interface FormGroup {
	/** The group's name, its heading (a short phrase; wraps); without it the group draws no heading, for fields that lead or close the form among titled groups. */
	title?: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	/** A note ahead of the fields (a `Banner`, a sentence). */
	lead?: ReactNode;
	/** The group's `FormField`s. */
	fields: ReactNode;
	/** What the group's fields hold, read once for the group's frame: its leaves paint while it waits, and its failure and a missing record stand in the fields' place. */
	read?: Selection<unknown>;
	/** The fields' sentence when the group's `read` is empty. */
	empty?: Empty;
}

interface FormBase extends Closed {
	/** The acts that close the form, drawn in its foot; the bar's filled act submits the form. */
	bar?: ActionBarProps;
	/** `field`: each field commits itself, so the form draws no bar and, standing edited, asks nothing when its screen is left. */
	commit?: "submit" | "field";
	/** What the form's fields hold, read once for the form's frame: the fields' leaves paint while it waits, the filled act with them, inert; its failure and a missing record stand in the fields' place. Each group has its own. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
}

// The form's structure is its props: `children`, a flat run of `FormField`s,
// or `groups`, each drawn as a titled group; never both. A form among a
// screen's other sections is `Section > Form`, so every section's head-to-body
// gap stays the pair step.
/** The structure every form draws, which the derived `Form`, a `Sheet`'s form and a `Gate`'s form (each over a procedure) fill. */
export type FormFrameProps = FormBase &
	(
		| {
				/** A flat run of `FormField`s, a fields step apart. */
				children?: ReactNode;
				groups?: never;
		  }
		| {
				children?: never;
				/** Groups of fields, a sections step apart, each its heading with its fields a fields step apart. */
				groups: readonly FormGroup[];
		  }
	);

/** Where a form stands: on a `page` (a `Form`, a `Gate`'s form), a card of its own; in a `sheet`, its rows flush on the sheet and its bar in the sheet's foot. */
export type FormIn = "page" | "sheet";

// One group: a run of the form's rows, its legend a band, then its lead and
// its fields, which are the group's own frame when it holds a `read`. A block
// of the form: it fades in as it mounts if it came on its own once the form
// was drawn.
function GroupBox(props: { group: FormGroup; arrived: boolean; at: number }) {
	const { group } = props;
	const frame = useFrame(group.read);
	return (
		<FadingView
			entering={props.arrived ? blockIn() : undefined}
			role="group"
			accessibilityLabel={group.title}
			accessibilityState={{
				busy: frame.holds && frame.form === "waiting",
			}}
			className={cn(ROWS, between(props.at))}
		>
			{group.title || group.description ? (
				<View className={cn(LIST_BAND, BAND)}>
					{group.title ? (
						<View className={LEGEND}>
							<RNText
								accessibilityRole="header"
								className={cn(text({ role: "heading" }), "shrink")}
							>
								{group.title}
							</RNText>
							<BusyMark frame={frame} />
						</View>
					) : null}
					{group.description ? (
						<Text role="meta">{group.description}</Text>
					) : null}
				</View>
			) : null}
			<FrameLine frame={frame} flow />
			{group.lead ? <View className={GROUP_ITEM}>{group.lead}</View> : null}
			<FrameBody frame={frame} fit="part" empty={group.empty}>
				{group.fields}
			</FrameBody>
		</FadingView>
	);
}

// What every form draws: the public `Form` (`in` the page), a `Sheet`'s (`in`
// the sheet) and a `Gate`'s (`in` the page, on the Gate's column). Outside the
// package's exports: `in` is the drawers' alone. A sheet's form takes the
// sheet's touched state, which its foot's bar reads too, and asks nothing when
// it is left. A bar the form is given is its last row under a hairline and
// submits what the form's own read gives (a group's read is the group's); a
// sheet hoists the bar into its foot, which reads the same.
export function FormBody({
	children,
	groups,
	bar,
	commit,
	read,
	empty,
	in: within,
	acting,
}: FormFrameProps & {
	in: FormIn;
	// The holder of the bar's run, when the form stands in one that holds more
	// than the bar (a docked sheet's dismissal).
	acting?: Acting<number>;
}) {
	const frame = useFrame(read);
	const arrived = useArrivals(
		groups?.map((group, index) => group.title ?? String(index)) ?? [],
		frame.form === "ready",
	);
	const [own] = useTouchState();
	const sheet = useTouched();
	const touch = within === "sheet" ? sheet : own;
	useLeaveGuard(touch.leave, within !== "sheet" && commit !== "field");
	const words = useWords();
	const { waiting, ended } = submitOf(words, frame.form);
	return (
		<TouchedContext.Provider value={touch}>
			<View
				accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
				className={cn(within === "page" && CARD, ROWS)}
			>
				<View className={ROWS}>
					<FrameLine frame={frame} flow />
					<FrameBody frame={frame} fit="part" empty={empty}>
						{groups
							? groups.map((group, index) => (
									<GroupBox
										key={group.title ?? index}
										group={group}
										arrived={arrived.has(group.title ?? String(index))}
										at={index}
									/>
								))
							: children}
					</FrameBody>
				</View>
				{bar ? (
					<View className={FORM_FOOT}>
						<ActionBarBase
							{...bar}
							acting={acting}
							painted={waiting}
							ended={ended}
						/>
					</View>
				) : null}
			</View>
		</TouchedContext.Provider>
	);
}
