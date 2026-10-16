import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type {
	ChangeKind,
	DefinitionData,
	IconAct,
	Lock,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import { painting } from "@fcalell/ui-core/paint";
import {
	DEFINITION_ROW,
	DEFINITION_ROW_CHEVRON,
	FIGURES,
	ROW_END,
	ROW_TEXT,
	ROW_TEXT_FLOOR,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { memo, type ReactNode } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useCopy } from "../../lib/copy";
import { Ink } from "../../lib/ink";
import { navigate } from "../../lib/navigate";
import { clipWhen, inertProps, Painted } from "../../lib/paint";
import type { Route } from "../../lib/route";
import { sameBy } from "../../lib/same-by";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { IconButtonBase } from "../icon-button/base";
import { Link } from "../link";
import type { DefinitionSlots } from "../list/index";
import { LockMark } from "../list-row/lock";
import { HeldPicker } from "../picker/base";
import type { PickOneProps } from "../picker/index";
import { StatusBase } from "../status/base";
import { ChangeMark } from "../status/change";
import type { SwitchProps } from "../switch";
import { HeldSwitch } from "../switch/base";

const ROW = "relative flex-row items-center";
// The hit covers the row under its text and its acts, and takes the press
// wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
// The text group wraps its label to the room the end group leaves; it takes
// the room left over unless the end group does. The end group is a line,
// centred on the row.
const TEXT_GROWS = "grow";
const END = "flex-row self-center items-center";
// A label with nothing under it keeps a rows inset above and below, so one that
// wraps has room; within the row's height a one-line label does not grow it.
const ALONE = "py-rows";
// A string or a status gives way before the label does: its end group takes
// the room the label leaves and its value (basis 0, so it asks for none) fills
// it, ending at the row's end. An identifier too long for it cuts in its
// middle, its stem truncating to the room and its tail standing whole
// (`valueCut`); words are one text run that truncates at its end.
const END_CUT = "grow min-w-0 justify-end";
// A status's text group keeps the row floor (`ROW_TEXT_FLOOR`).
const END_STATUS = `${END_CUT} min-w-0`;
const VALUE = "flex-1 min-w-0 flex-row justify-end";
const STEM = "shrink";
const TAIL = "shrink-0";
// A control stands whole at the row's end, the label wrapping beside it; so
// does an act or a chevron with no value.
const CONTROL = "shrink-0 flex-row";
const ACTS = "relative flex-row shrink-0";
const CHEVRON = "shrink-0 items-center justify-center";

export type DefinitionValue = DefinitionData;

interface DefinitionRowBase extends Closed {
	// Where the fact stands in a change set: its mark at the row's start, ahead
	// of the label.
	change?: ChangeKind;
	/** What the fact is (a short phrase; wraps to the room its value leaves). */
	label: string;
	// Words that are copied whole (an identifier): drawn in the code role with
	// a copy act.
	copyable?: boolean;
}

// The fact's value, a constant or a selection (it paints, inert, until its
// read lands): words or a status; or a `switch` that changes it in
// place (the Switch's own props, named by the row's label); or a `pick` that
// chooses it in place (the options and the change, named by the row's label);
// never more than one.
type DefinitionRowValue<V extends string | null> =
	| {
			value?: Datum<DefinitionValue>;
			switch?: never;
			pick?: never;
	  }
	| {
			value?: never;
			switch: Omit<SwitchProps, "label">;
			pick?: never;
	  }
	| {
			value?: never;
			switch?: never;
			pick: Omit<PickOneProps<V>, "fit" | "act">;
	  };

// A labelled fact in a Group: editable here, or locked with its reason.
export type DefinitionRowProps<V extends string | null = string> =
	DefinitionRowBase &
		DefinitionRowValue<V> &
		(
			| {
					locked?: never;
					/** Under the label and the value, at the row's width (a sentence; wraps). A selection paints, inert, until its read lands. */
					description?: Datum<string>;
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

// What a `List` hands the row it draws while its items are not here; no app
// sets them, so they are outside `DefinitionRowProps`.
export interface DefinitionRowInternal {
	// The fact is not here: the label, the value, the description and the
	// controls paint, the row takes no touch and builds no link. The slots are
	// run over the placeholder, so they say which parts the loaded row has.
	painted?: boolean;
	// The row's place among the painted rows, which varies the filler's lengths.
	at?: number;
}

const NOOP = () => {};

function isStatus(
	value: DefinitionValue | undefined,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

// The change mark at the start, the label at body 500 with the value at the line's end, the description
// under both; an icon act, or a link's chevron in the act's square, at the
// row's end, the square empty on a row with neither, so every value in a Group
// ends at one x; the label wraps to the room its value leaves. A row that opens is one hit
// under its acts. A locked row draws a lock after its value and its reason
// under both in the description's place, the whole line a link with an
// `href`. A `value` or `description` that is a selection paints in its place,
// and the row takes no touch, until its read lands.
export function DefinitionRow<V extends string | null = string>(
	fact: DefinitionRowProps<V>,
) {
	return <DefinitionRowBase {...fact} />;
}

// Every definition row: the public `DefinitionRow`, or the one a `List`
// paints. Outside the package's exports.
export function DefinitionRowBase<V extends string | null = string>({
	change,
	label,
	description,
	value,
	switch: toggle,
	pick,
	copyable,
	locked,
	act,
	href,
	onOpen,
	painted: listed = false,
	at = 0,
}: DefinitionRowProps<V> & DefinitionRowInternal) {
	const [shown, said] = useSelections([value, description]);
	// Painted by the list, or by a datum of its own that waits: either way the
	// row draws its loaded tree, each part the datum reaches in its filler, and
	// takes no press. A datum whose read ended draws nothing (the label alone);
	// the frame that holds the read says why.
	const waitsValue = listed || paints(shown);
	const waitsUnder = listed || paints(said);
	const painted = waitsValue || waitsUnder;
	const opens = href !== undefined || onOpen !== undefined;
	const open = href !== undefined ? () => navigate(href) : onOpen;
	// A placeholder is a function proxy that no type test passes: the value is
	// read only once painted is ruled out.
	const plain = listed || shown.painted ? undefined : shown.value;
	const copied = copyable && typeof plain === "string" ? plain : undefined;
	// A press on a row that opens goes through its text and its value to the hit
	// under them.
	const shut = open && !painted ? "none" : "auto";
	// How the end group stands when the row is out of room: a string's or a
	// status's takes the room the label leaves and is cut in it, a control's
	// stands whole.
	let stands = "";
	let valueNode: ReactNode = null;
	if (waitsValue && value !== undefined) {
		stands = isStatus(shown.value as DefinitionValue | undefined)
			? END_STATUS
			: END_CUT;
		valueNode = isStatus(shown.value as DefinitionValue | undefined) ? (
			<View pointerEvents={shut} className={VALUE}>
				<StatusBase painted />
			</View>
		) : (
			<View pointerEvents={shut} className={VALUE}>
				<RNText
					numberOfLines={1}
					{...clipWhen(true)}
					className={cn(
						text({ role: copyable ? "code" : "meta" }),
						FIGURES,
						STEM,
					)}
				>
					<Painted role={copyable ? "id" : "phrase"} at={at} />
				</RNText>
			</View>
		);
	} else if (typeof plain === "string") {
		stands = END_CUT;
		const { stem, tail } = valueCut(plain);
		const role = cn(text({ role: copied ? "code" : "meta" }), FIGURES);
		// The two parts read as the one value.
		valueNode = (
			<View
				accessible
				accessibilityLabel={plain}
				pointerEvents={shut}
				className={VALUE}
			>
				<RNText numberOfLines={1} className={cn(role, STEM)}>
					{stem}
				</RNText>
				{tail ? (
					<RNText numberOfLines={1} className={cn(role, TAIL)}>
						{tail}
					</RNText>
				) : null}
			</View>
		);
	} else if (isStatus(plain)) {
		stands = END_STATUS;
		valueNode = (
			<View pointerEvents={shut} className={VALUE}>
				<StatusBase state={plain.status} label={plain.label} />
			</View>
		);
	} else if (toggle)
		valueNode = (
			<View className={CONTROL}>
				<HeldSwitch {...toggle} label={listed ? "" : label} painted={painted} />
			</View>
		);
	else if (pick)
		valueNode = (
			<View className={CONTROL}>
				<HeldPicker {...pick} fit="row" painted={painted} />
			</View>
		);
	const copy = copyable && waitsValue;
	let end: ReactNode = null;
	if (copy || copied !== undefined || act) {
		let acted: ReactNode = null;
		if (act)
			acted = listed ? (
				<IconButtonBase
					icon="Ellipsis"
					fit="bar"
					label=""
					onAct={NOOP}
					painted
				/>
			) : (
				<IconButton
					icon={act.icon}
					fit="bar"
					label={act.label}
					onAct={act.onAct}
				/>
			);
		end = (
			<View className={ACTS}>
				{copy ? (
					<IconButtonBase icon="Copy" fit="bar" label="" onAct={NOOP} painted />
				) : copied === undefined ? null : (
					<CopyAct label={label} value={copied} />
				)}
				{acted}
			</View>
		);
	} else if (opens)
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
	let under: ReactNode;
	if (locked) {
		if (listed) under = <Painted role="sentence" at={at} />;
		else if (locked.href === undefined) under = locked.reason;
		else under = <Link href={locked.href}>{locked.reason}</Link>;
	} else if (description !== undefined) {
		under = waitsUnder ? (
			<Painted role="sentence" at={at} />
		) : said.painted ? undefined : (
			(said.value as string)
		);
	}
	return (
		<View
			{...inertProps(painted)}
			className={cn(
				row({
					lines: under ? "setting" : "one",
					state: "rest",
				}),
				DEFINITION_ROW,
				ROW,
			)}
		>
			{open && !painted ? (
				<Pressable
					accessibilityRole={href !== undefined ? "link" : "button"}
					accessibilityLabel={label}
					onPress={open}
					className={HIT}
				/>
			) : null}
			{change ? <ChangeMark kind={change} painted={listed} /> : null}
			<View
				pointerEvents={shut}
				className={cn(
					ROW_TEXT,
					stands === END_STATUS && ROW_TEXT_FLOOR,
					!stands.startsWith(END_CUT) && TEXT_GROWS,
				)}
			>
				<RNText
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						!under && ALONE,
					)}
				>
					{listed ? <Painted role="name" at={at} /> : label}
				</RNText>
				{under ? (
					<RNText className={text({ role: "meta" })}>{under}</RNText>
				) : null}
			</View>
			{valueNode || locked || end ? (
				<View
					pointerEvents={open && !painted ? "box-none" : "auto"}
					className={cn(ROW_END, END, stands)}
				>
					{valueNode}
					{locked ? <LockMark painted={listed} /> : null}
					{end}
				</View>
			) : null}
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

// One definition row of a `List` from its item: it runs the slots itself and
// opens the item itself, so a refetch that changes one item renders that row
// alone.
function DefinitionItemBase<T>(props: {
	item: T;
	/** A painted row's place, which varies its fillers; a loaded row takes none. */
	index?: number;
	definition: DefinitionSlots<T>;
	painted: boolean;
}) {
	const { item, index, definition, painted } = props;
	const slot = <R,>(fn: (one: T) => R): R =>
		painted ? (painting(fn, item) as R) : fn(item);
	const locked = definition.locked && slot(definition.locked);
	const shared = {
		change: definition.change && slot(definition.change),
		label: slot(definition.label),
		value: definition.value && slot(definition.value),
		copyable: definition.copyable,
		painted,
		at: index,
	};
	if (locked) return <DefinitionRowBase {...shared} locked={locked} />;
	return (
		<DefinitionRowBase
			{...shared}
			description={definition.description && slot(definition.description)}
			act={definition.act && slot(definition.act)}
			href={definition.href && slot(definition.href)}
			onOpen={definition.onOpen ? () => definition.onOpen?.(item) : undefined}
		/>
	);
}

export const DefinitionItem = memo(
	DefinitionItemBase,
	sameBy("item"),
) as typeof DefinitionItemBase;
