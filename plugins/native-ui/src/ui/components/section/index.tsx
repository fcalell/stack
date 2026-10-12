import type {
	Act,
	IconAct,
	MenuItem,
	Part,
} from "@fcalell/ui-core/descriptors";
import {
	SECTION,
	SECTION_ACTS,
	SECTION_BODY,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_NESTED_TITLE,
	SECTION_TITLE,
	SECTION_TOGGLE,
	skeleton,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LABEL_LINE } from "../../lib/field-wait";
import { FormStands } from "../../lib/form";
import { Ink } from "../../lib/ink";
import { LoadingContext, useWait, VEIL } from "../../lib/loading";
import { partText } from "../../lib/parts";
import { SectionContext } from "../../lib/section";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { Count } from "../count";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { MenuBase } from "../menu/base";
import { Text } from "../text";

const BOX = "min-w-0";
const HEAD_ROW = "flex-row items-center";
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
// The waiting count is a bar one figure wide: an unseen figure at the
// count's type sets the width.
const COUNT_WAIT = "shrink-0 flex-row items-center";
const FIGURE_WAIT = "opacity-0 tabular-nums";
const BODY_FOLDED = "hidden";

export interface SectionProps extends Closed {
	/** The heading (a short phrase; truncates). */
	title: Part;
	// The body's total, in the muted ink after the title; none is drawn
	// without it, at zero (the body's empty state says so) or, as a waiting
	// bar, while the section loads.
	count?: number;
	/** Under the title (a sentence; wraps). While the Section loads, `""` stands one meta-height bar where the sentence will be and an undefined `description` stands none; loaded, `""` draws no line, as an undefined one. */
	description?: string;
	// Set, the title folds the body, and this is its initial fold: `true`
	// starts folded, `false` open; later changes are not read.
	folded?: boolean;
	// Called as a foldable section opens or closes, with whether it is now
	// open.
	onToggle?: (open: boolean) => void;
	act?: Act | IconAct;
	// The section's other acts, in a menu under the more act after its act
	// (destructive ones marked); a foldable section's more does not fold it.
	more?: readonly MenuItem[];
	// The head is busy and the body waits: each part of the body draws its own
	// waiting form (a Group or a List its skeleton rows, a Prose, Thread, Code,
	// Meter, Slider, DefinitionRow, FormField or ActionBar its own); the
	// section reads nothing else, so a body no part answers for draws as it is.
	loading?: boolean;
	children?: ReactNode;
}

// A heading with its count, description and act over its body; the title
// folds the body when `folded` is set. A loading section hands its loading to
// its body, whose parts each draw their own waiting form. A blocked act says
// its reason under itself once pressed
// or once its form or sheet is touched, as a `Button` does. React Native
// exposes no heading level, so the title is a header at any depth.
export function Section({
	title,
	count,
	description,
	folded,
	onToggle,
	act,
	more,
	loading: asked,
	children,
}: SectionProps) {
	// The wait is a read that lasts: drawn after a delay and held a minimum; the
	// head's title and act stay, what waits in the head and the body is undrawn
	// meanwhile.
	const late = useWait(asked === true);
	const loading = asked === undefined ? undefined : late.waiting;
	const veil = late.veiled ? VEIL : undefined;
	const words = useWords();
	// A Section inside a Section names itself a level below its parent.
	const nested = useContext(SectionContext);
	// A section in a sheet's body reads a level below the sheet's title.
	const stood = useContext(FormStands) === "sheet";
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	// The head is busy exactly while the section loads; its count is the one it
	// is given.
	const busy = loading === true;
	// The description waits as a bar only when the Section says it will have
	// one: an empty string, which is no line once loaded.
	let sentence: ReactNode = null;
	if (description) sentence = <Text role="meta">{description}</Text>;
	else if (loading === true && description === "")
		sentence = (
			<View className={cn(LABEL_LINE, veil)}>
				<Strut role="meta" />
				<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
			</View>
		);
	// A count waits with the body.
	let tally: ReactNode = null;
	if (count !== undefined && busy)
		tally = (
			<View className={cn(skeleton({ kind: "count" }), COUNT_WAIT, veil)}>
				<RNText className={cn(text({ role: "caption" }), FIGURE_WAIT)}>
					0
				</RNText>
			</View>
		);
	else if (count !== undefined && count !== 0) tally = <Count value={count} />;
	const name = (
		<>
			<RNText
				numberOfLines={1}
				className={
					nested || stood || folded !== undefined
						? SECTION_NESTED_TITLE
						: text({ role: "heading" })
				}
			>
				{partText(title)}
			</RNText>
			{tally}
		</>
	);
	return (
		<View accessibilityState={{ busy }} className={cn(SECTION, BOX)}>
			<View className={SECTION_HEAD}>
				<View
					className={cn(
						SECTION_BODY,
						SECTION_HEAD_ROW,
						HEAD_ROW,
						act && !("icon" in act) && WRAP,
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
					{act || more?.length ? (
						<View className={cn(SECTION_ACTS, ACT_SLOT)}>
							{act === undefined ? null : "icon" in act ? (
								<IconButton
									icon={act.icon}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
									loading={act.loading}
								/>
							) : (
								<Button
									act={act.destructive ? "destructive" : "secondary"}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
									loading={act.loading}
									blocked={act.blocked}
								/>
							)}
							{more?.length ? (
								<MenuBase
									label={`${words.more} ${partText(title)}`}
									title={partText(title)}
									items={more}
								/>
							) : null}
						</View>
					) : null}
				</View>
			</View>
			{/* A section without children draws no body. */}
			{children === undefined || children === null ? null : (
				<View className={cn(SECTION_BODY, !open && BODY_FOLDED, veil)}>
					<LoadingContext.Provider value={loading === true}>
						<SectionContext.Provider value={true}>
							{children}
						</SectionContext.Provider>
					</LoadingContext.Provider>
				</View>
			)}
		</View>
	);
}
