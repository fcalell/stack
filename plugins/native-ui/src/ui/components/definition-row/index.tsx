import type {
	ChangeKind,
	IconAct,
	Lock,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import {
	DEFINITION_ROW,
	DEFINITION_ROW_CHEVRON,
	ROW_TITLE_LINE,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useCopy } from "../../lib/copy";
import { Ink } from "../../lib/ink";
import { navigate } from "../../lib/navigate";
import type { Route } from "../../lib/route";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { Link } from "../link";
import { LockMark } from "../list-row/lock";
import { Status } from "../status";
import { ChangeMark } from "../status/change";

const ROW = "relative flex-row items-center";
// The hit covers the row under its text and its acts, and takes the press
// wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
const TEXT_BLOCK = "flex-1 min-w-0";
const LINE = "flex-row items-center min-w-0";
const LABEL = "shrink";
// The value gives way first: it takes the room the label leaves, ending at
// the line's end.
const VALUE = "flex-1 min-w-0 text-right";
const VALUE_SLOT = "flex-1 min-w-0 flex-row justify-end";
const ACTS = "relative flex-row shrink-0";
const CHEVRON = "shrink-0 items-center justify-center";

export type DefinitionValue =
	| string
	| { status: StatusState; label?: string }
	| ReactNode;

interface DefinitionRowBase extends Closed {
	// Where the fact stands in a change set: its mark at the row's start, ahead
	// of the label.
	change?: ChangeKind;
	label: string;
	// The fact: words, a status, or a control that changes it in place.
	value?: DefinitionValue;
	// Words that are copied whole (an identifier): drawn in the code role with
	// a copy act.
	copyable?: boolean;
}

// A labelled fact in a Group: editable here, or locked with its reason.
export type DefinitionRowProps = DefinitionRowBase &
	(
		| {
				locked?: never;
				// A sentence under the label and the value, at the row's width.
				description?: string;
				// The row's one icon act at its end.
				act?: IconAct;
				// Where the row goes when opened; a chevron stands at its end.
				href?: Route;
				onOpen?: () => void;
		  }
		| {
				// The value outside its editable context: a lock after it and the
				// reason under it, the whole line a link with an `href`. It takes
				// no description, act or open.
				locked: Lock;
				description?: never;
				act?: never;
				href?: never;
				onOpen?: never;
		  }
	);

function isStatus(
	value: DefinitionValue,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

// The change mark at the start, the label at body 500 with the value at the line's end, the description
// under both; an icon act, or a link's chevron in the act's square, at the
// row's end, so values with either end at one x. A row that opens is one hit
// under its acts. A locked row draws a lock after its value and its reason
// under both in the description's place, the whole line a link with an
// `href`.
export function DefinitionRow({
	change,
	label,
	description,
	value,
	copyable,
	locked,
	act,
	href,
	onOpen,
}: DefinitionRowProps) {
	const open = href !== undefined ? () => navigate(href) : onOpen;
	const copied = copyable && typeof value === "string" ? value : undefined;
	let shown: ReactNode = null;
	if (typeof value === "string")
		shown = (
			<RNText
				numberOfLines={1}
				className={cn(text({ role: copied ? "code" : "meta" }), VALUE)}
			>
				{value}
			</RNText>
		);
	else if (isStatus(value))
		shown = (
			<View className={VALUE_SLOT}>
				<Status state={value.status} label={value.label} />
			</View>
		);
	else if (value !== undefined && value !== null)
		shown = <View className={VALUE_SLOT}>{value}</View>;
	let end: ReactNode = null;
	if (copied !== undefined || act)
		end = (
			<View className={ACTS}>
				{copied === undefined ? null : <CopyAct label={label} value={copied} />}
				{act ? (
					<IconButton
						icon={act.icon}
						fit="bar"
						label={act.label}
						onAct={act.onAct}
					/>
				) : null}
			</View>
		);
	else if (open)
		end = (
			<View
				pointerEvents="none"
				className={cn(DEFINITION_ROW_CHEVRON, CHEVRON)}
			>
				<Ink.Provider value="ink-meta">
					<Icon name="ChevronRight" />
				</Ink.Provider>
			</View>
		);
	let under: ReactNode = description;
	if (locked)
		under =
			locked.href === undefined ? (
				locked.reason
			) : (
				<Link href={locked.href}>{locked.reason}</Link>
			);
	return (
		<View
			className={cn(
				row({
					lines: under ? "setting" : "one",
					state: "rest",
					ground: "group",
				}),
				DEFINITION_ROW,
				ROW,
			)}
		>
			{open ? (
				<Pressable
					accessibilityRole={href !== undefined ? "link" : "button"}
					accessibilityLabel={label}
					onPress={open}
					className={HIT}
				/>
			) : null}
			{change ? <ChangeMark kind={change} /> : null}
			<View pointerEvents={open ? "none" : "auto"} className={TEXT_BLOCK}>
				<View className={cn(ROW_TITLE_LINE, LINE)}>
					<RNText
						numberOfLines={1}
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							LABEL,
						)}
					>
						{label}
					</RNText>
					{shown}
					{locked ? <LockMark /> : null}
				</View>
				{under ? (
					<RNText className={text({ role: "meta" })}>{under}</RNText>
				) : null}
			</View>
			{end}
		</View>
	);
}

// The copy act: a check and the word Copied for two seconds once copied; a
// refused write raises the failed Toast.
function CopyAct({ label, value }: { label: string; value: string }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<IconButton
			icon={done ? "Check" : "Copy"}
			fit="bar"
			label={done ? words.copied : `${words.copy} ${label}`}
			onAct={() => copy(value)}
		/>
	);
}
