import type { Act, IconAct, Part } from "@fcalell/ui-core/descriptors";
import { sectionState } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_TITLE,
	SECTION_TOGGLE,
	section,
	skeleton,
	skeletonRow,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FormContext } from "../../lib/form";
import { ThreadRoom } from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { LoadingContext } from "../../lib/loading";
import { partText } from "../../lib/parts";
import {
	SectionContext,
	type SectionKinds,
	sectionPartsOf,
} from "../../lib/section";
import { BarChart } from "../bar-chart";
import { Button } from "../button";
import { Comparison } from "../comparison";
import { Count } from "../count";
import { FormField } from "../form-field";
import { Group } from "../group";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { List } from "../list";
import { QueryBoundary } from "../query-boundary";
import { Table } from "../table";
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
const ACT_SLOT = "flex-row items-center shrink-0";
// The waiting count stands at a one-figure pill's width: the pill's padding
// round an unseen figure at the pill's type.
const COUNT_WAIT = "shrink-0 flex-row items-center px-inside";
const FIGURE_WAIT = "opacity-0 tabular-nums";
// The label line at the length of a field label.
const LABEL_WAIT = "w-1/4";
// The label's bar stands in the label's line box: a strut sets the line's
// height, as the web's `h-lh` does.
const LABEL_LINE = "flex-row items-center";
const STRUT = "\u200B";
const BODY_FOLDED = "hidden";
// The body's own wrapper stays mounted, hidden, while skeleton fields stand
// in for it.
const BODY_WAITS = "hidden";

// The components the Section reads its body by (`sectionPartsOf`).
const KINDS: SectionKinds = {
	lists: [List, Table],
	waits: [BarChart, Comparison],
	boundary: QueryBoundary,
	group: Group,
	field: FormField,
};

export interface SectionProps extends Closed {
	title: Part;
	// A total the body's lists do not hold; without it a List in the body
	// counts its items here.
	count?: number;
	description?: string;
	// Set, the title folds the body, and this is its initial fold: `true`
	// starts folded, `false` open; later changes are not read.
	folded?: boolean;
	// Called as a foldable section opens or closes, with whether it is now
	// open.
	onToggle?: (open: boolean) => void;
	act?: Act | IconAct;
	loading?: boolean;
	children?: ReactNode;
}

// A heading with its count, description and act over its body; the title
// folds the body when `folded` is set. Inside a Form it takes the fields
// rhythm. A loading section hands its loading to a Group or a List in its
// body, which draws its own skeleton rows; any other body waits as three
// skeleton fields. A blocked act says its reason under itself once pressed
// or once its form or sheet is touched, as a `Button` does. React Native
// exposes no heading level, so the title is a header at any depth.
export function Section({
	title,
	count,
	description,
	folded,
	onToggle,
	act,
	loading,
	children,
}: SectionProps) {
	const within = useContext(FormContext) ? "form" : "page";
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	// The Section reads its body's collections off its children in render (by
	// the depth rule, `sectionPartsOf`): a waiting one makes the head busy, a
	// List or a Table counts there unless the Section has its own count, and a
	// loading body with no rows waits as skeleton fields while it stays
	// mounted, hidden, so what it holds (a field's text) outlives the wait.
	const {
		busy,
		counted,
		count: shown,
		fields,
	} = sectionState(sectionPartsOf(children, KINDS), { count, loading });
	// A count waits with the body.
	let tally: ReactNode = null;
	if (counted && busy)
		tally = (
			<View className={cn(skeleton({ kind: "count" }), COUNT_WAIT)}>
				<RNText className={cn(text({ role: "caption" }), FIGURE_WAIT)}>
					0
				</RNText>
			</View>
		);
	else if (shown !== undefined) tally = <Count value={shown} />;
	const name = (
		<>
			<RNText numberOfLines={1} className={text({ role: "heading" })}>
				{partText(title)}
			</RNText>
			{tally}
		</>
	);
	return (
		<View
			accessibilityState={{ busy }}
			className={cn(section({ in: within }), BOX)}
		>
			<View className={SECTION_HEAD}>
				<View
					className={cn(
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
										{name}
										<Ink.Provider value={pressed ? "ink-body" : "ink-meta"}>
											<Icon name={open ? "ChevronDown" : "ChevronRight"} />
										</Ink.Provider>
									</>
								)}
							</Pressable>
						)}
						{description ? <Text role="meta">{description}</Text> : null}
					</View>
					{act ? (
						<View className={ACT_SLOT}>
							{"icon" in act ? (
								<IconButton
									icon={act.icon}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
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
						</View>
					) : null}
				</View>
			</View>
			{/* A section without children draws no body. */}
			{children === undefined || children === null ? null : (
				<View className={cn(section({ in: within }), !open && BODY_FOLDED)}>
					{fields > 0
						? Array.from(
								{ length: fields },
								(_, index) => `field-${index}`,
							).map((key) => (
								<View key={key} className={skeletonRow({ kind: "field" })}>
									<View className={LABEL_LINE}>
										<RNText className={lineBox({ role: "body" })}>
											{STRUT}
										</RNText>
										<View
											className={cn(skeleton({ kind: "line" }), LABEL_WAIT)}
										/>
									</View>
									<View className={skeleton({ kind: "field" })} />
								</View>
							))
						: null}
					<View
						className={cn(section({ in: within }), fields > 0 && BODY_WAITS)}
					>
						<LoadingContext.Provider value={loading === true}>
							<SectionContext.Provider value={true}>
								<ThreadRoom.Provider value={false}>
									{children}
								</ThreadRoom.Provider>
							</SectionContext.Provider>
						</LoadingContext.Provider>
					</View>
				</View>
			)}
		</View>
	);
}
