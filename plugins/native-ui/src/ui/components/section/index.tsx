import type { Act, IconAct, Part } from "@fcalell/ui-core/descriptors";
import {
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_TITLE,
	SECTION_TOGGLE,
	section,
	skeleton,
	skeletonRow,
	text,
} from "@fcalell/ui-core/variants";
import {
	Children,
	isValidElement,
	type ReactNode,
	useContext,
	useState,
} from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FormContext } from "../../lib/form";
import { Ink } from "../../lib/ink";
import { LoadingContext } from "../../lib/loading";
import { partText } from "../../lib/parts";
import { SectionContext } from "../../lib/section";
import { Button } from "../button";
import { Count } from "../count";
import { Group } from "../group";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { List } from "../list";
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
const COUNT_WAIT = "shrink-0";
// The label line at the length of a field label.
const LABEL_WAIT = "w-1/4";
const BODY_FOLDED = "hidden";
// The loading fields: a body of fields waits as three.
const FIELDS = ["first", "second", "third"];

export interface SectionProps extends Closed {
	title: Part;
	count?: number;
	description?: string;
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
	const nodes = Children.toArray(children);
	const rows = nodes.some(
		(node) =>
			isValidElement(node) && (node.type === Group || node.type === List),
	);
	const [open, setOpen] = useState(folded !== true);
	// A QueryBoundary in the body waits through the Section: it draws its
	// rows waiting, the Section its busy head.
	const [waiting, setWaiting] = useState(false);
	const busy = loading === true || waiting;
	// A count waits with the body.
	let tally: ReactNode = null;
	if (count !== undefined)
		tally = busy ? (
			<View className={cn(skeleton({ kind: "count" }), COUNT_WAIT)} />
		) : (
			<Count value={count} />
		);
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
			{nodes.length === 0 ? null : (
				<View className={cn(section({ in: within }), !open && BODY_FOLDED)}>
					{loading && !rows ? (
						FIELDS.map((key) => (
							<View key={key} className={skeletonRow({ kind: "field" })}>
								<View className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
								<View className={skeleton({ kind: "field" })} />
							</View>
						))
					) : (
						<LoadingContext.Provider value={loading === true}>
							<SectionContext.Provider value={setWaiting}>
								{children}
							</SectionContext.Provider>
						</LoadingContext.Provider>
					)}
				</View>
			)}
		</View>
	);
}
