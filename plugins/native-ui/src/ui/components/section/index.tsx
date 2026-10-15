import {
	type Datum,
	type Selection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type {
	Act,
	IconAct,
	MenuItem,
	Part,
} from "@fcalell/ui-core/descriptors";
import { paintText } from "@fcalell/ui-core/paint";
import {
	SECTION,
	SECTION_ACTS,
	SECTION_BODY,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_TITLE,
	SECTION_TOGGLE,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { EmptyBase, type EmptyProps } from "../../lib/empty";
import { Ink } from "../../lib/ink";
import { clipWhen, Painted } from "../../lib/paint";
import { partText } from "../../lib/parts";
import { BusyMark, FrameBody, FrameLine, useFrame } from "../../lib/read";
import { useWords } from "../../lib/words";
import { ButtonBase } from "../button/base";
import { Count } from "../count";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { IconButtonBase } from "../icon-button/base";
import { MenuBase } from "../menu/base";
import { Text } from "../text";

const BOX = "min-w-0";
const HEAD_ROW = "flex-row items-center";
// The waiting description's bar stands in a text line's box: a strut sets the
// line's height, as the web's `h-lh` does.
// A labelled act that would squeeze the title column wraps under the title:
// the column's basis is its own width, so the row breaks once the title, its
// count and its description cannot stand beside the act.
const WRAP = "flex-wrap";
const TITLE_BLOCK = "grow min-w-0";
const TITLE_LINE = "flex-row items-center min-w-0";
const TOGGLE =
	"flex-row items-center grow min-w-0 -ms-inside active:bg-wash-press";
// The act and the more stand a row's act gap apart (`SECTION_ACTS`, as ListRow's).
const ACT_SLOT = "flex-row items-center shrink-0";
const BODY_FOLDED = "hidden";

export interface SectionProps extends Closed {
	/** The heading (a short phrase; truncates). */
	title: Part;
	/** The body's total, in the muted ink after the title; none is drawn without it, at zero (the body's empty state says so) or while the section waits. With a `read` of an array the total is the array's length once it lands, so none is given. */
	count?: number;
	/** Under the title (a sentence; wraps). It paints where it will stand while its selection waits. `""` and an undefined one draw no line. */
	description?: Datum<string>;
	// Set, the title folds the body, and this is its initial fold: `true`
	// starts folded, `false` open; later changes are not read.
	folded?: boolean;
	// Called as a foldable section opens or closes, with whether it is now
	// open.
	onToggle?: (open: boolean) => void;
	/** The section's one act, at the head's end: a labelled act or an icon act. It paints, inert, while the `read` has no data (waits, stands still, failed or missing) or its own selection waits. */
	act?: Datum<Act | IconAct>;
	/** The section's other acts, in a menu under the more act after its act (destructive ones marked); a foldable section's more does not fold it. It paints, inert, as the act does. */
	more?: Datum<readonly MenuItem[]>;
	/** What the section's body holds, read once for the frame: while it waits the body's leaves paint, its failure and a missing record stand in the body's place, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait, empty and count. */
	read?: Selection<unknown>;
	/** The section holds nothing yet: this stands in its body's place, framed, or as one quiet sentence when only the sentence is given. With a `read` it stands only when the selection is empty. */
	empty?: EmptyProps;
	/** What the body says when the `read` fails, in place of the generic sentence (a sentence; wraps). */
	failed?: string;
	// The body: a Group, a List, a Form or any other parts; none stand while
	// `empty` is set.
	children?: ReactNode;
}

// A heading with its count, description and act over its body; the title
// folds the body when `folded` is set. A blocked act says its reason under
// itself once pressed or once its form or sheet is touched, as a `Button` does. React Native
// exposes no heading level, so the title is a header at any depth. The title
// is the heading size, folded or not, and no Section stands in a Section.
export function Section({
	title,
	count,
	description,
	folded,
	onToggle,
	act,
	more,
	read,
	empty,
	failed,
	children,
}: SectionProps) {
	const words = useWords();
	const frame = useFrame(read);
	const [said, shownAct, shownMore] = useSelections([description, act, more]);
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	let sentence: ReactNode = null;
	if (said.painted)
		sentence = (
			<RNText
				numberOfLines={1}
				{...clipWhen(true)}
				className={text({ role: "meta" })}
			>
				<Painted role="phrase" />
			</RNText>
		);
	else if (said.value) sentence = <Text role="meta">{said.value}</Text>;
	// A count is not drawn while its body waits: a painted chip would carry an
	// unseen "0" for a number nobody knows yet, and the count arrives at the
	// title's end, where it moves nothing. A read of an array gives its length.
	const total = frame.inert ? undefined : (frame.count ?? count);
	const tally =
		total !== undefined && total !== 0 ? <Count value={total} /> : null;
	// The acts paint, inert, while the read waits or their own datum does. A
	// selection's shape is unknown until it lands, so its paint is a labelled act.
	const given = shownAct.painted ? undefined : shownAct.value;
	const labelled =
		shownAct.painted || (given !== undefined && !("icon" in given));
	let actNode: ReactNode = null;
	if (shownAct.painted)
		actNode = (
			<ButtonBase act="secondary" fit="bar" label={paintText("word")} painted />
		);
	else if (given !== undefined && "icon" in given)
		actNode = frame.inert ? (
			<IconButtonBase
				icon={given.icon}
				fit="bar"
				label={given.label}
				onAct={given.onAct}
				painted
			/>
		) : (
			<IconButton
				icon={given.icon}
				fit="bar"
				label={given.label}
				onAct={given.onAct}
				failed={given.failed}
			/>
		);
	else if (given !== undefined)
		actNode = (
			<ButtonBase
				act={given.destructive ? "destructive" : "secondary"}
				fit="bar"
				label={given.label}
				onAct={given.onAct}
				failed={given.failed}
				blocked={given.blocked}
				painted={frame.inert}
			/>
		);
	const items = shownMore.painted ? [] : (shownMore.value ?? []);
	const name = (
		<>
			<RNText numberOfLines={1} className={text({ role: "heading" })}>
				{partText(title)}
			</RNText>
			{tally}
			<BusyMark frame={frame} />
		</>
	);
	const body =
		read === undefined ? (
			empty ? (
				<EmptyBase fit="frame" tone="rest" {...empty} />
			) : (
				children
			)
		) : (
			<FrameBody frame={frame} fit="frame" empty={empty} failed={failed}>
				{children}
			</FrameBody>
		);
	return (
		<View
			accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
			className={cn(SECTION, BOX)}
		>
			<View className={SECTION_HEAD}>
				<View
					className={cn(
						SECTION_BODY,
						SECTION_HEAD_ROW,
						HEAD_ROW,
						labelled && WRAP,
					)}
				>
					<View className={TITLE_BLOCK}>
						{folded === undefined ? (
							<View
								accessibilityRole="header"
								className={cn(SECTION_TITLE, TITLE_LINE)}
							>
								{name}
							</View>
						) : (
							<Pressable
								accessibilityRole="button"
								accessibilityState={{ expanded: open }}
								onPress={() => {
									setOpen(!open);
									onToggle?.(!open);
								}}
								className={cn(SECTION_TOGGLE, TOGGLE)}
							>
								{({ pressed }) => (
									<>
										<Ink.Provider value={pressed ? "ink-body" : "ink-meta"}>
											<Icon name={open ? "ChevronDown" : "ChevronRight"} />
										</Ink.Provider>
										{name}
									</>
								)}
							</Pressable>
						)}
						{sentence}
					</View>
					{actNode || shownMore.painted || items.length ? (
						<View className={cn(SECTION_ACTS, ACT_SLOT)}>
							{actNode}
							{shownMore.painted || items.length ? (
								<MenuBase
									label={`${words.more} ${partText(title)}`}
									title={partText(title)}
									items={items}
									painted={shownMore.painted || frame.inert}
								/>
							) : null}
						</View>
					) : null}
				</View>
				<FrameLine frame={frame} />
			</View>
			{/* A section without children draws no body. */}
			{body === undefined || body === null ? null : (
				<View className={cn(SECTION_BODY, !open && BODY_FOLDED)}>{body}</View>
			)}
		</View>
	);
}
