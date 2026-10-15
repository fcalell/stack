import { Button as BaseButton } from "@base-ui/react/button";
import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	ChangeKind,
	DefinitionData,
	IconAct,
	Lock,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import {
	DEFINITION_ROW,
	DEFINITION_ROW_CHEVRON,
	FIGURES,
	ROW_TITLE_LINE,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useCopy } from "../../lib/copy.ts";
import { follow } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Link } from "../link/index.tsx";
import { LockMark } from "../list-row/lock.tsx";
import { PickerBase } from "../picker/base.tsx";
import type { PickOneProps } from "../picker/index.tsx";
import { StatusBase } from "../status/base.tsx";
import { ChangeMark } from "../status/change.tsx";
import { HeldSwitch } from "../switch/base.tsx";
import type { SwitchProps } from "../switch/index.tsx";

const ROW = "relative flex items-center";
// A row that opens washes under the pointer and the press on its hit.
const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
// The label is the link: its after layer covers the row, so the whole row
// opens, and draws the ring inset at the row's edge.
const HIT =
	"after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring";
const TEXT_BLOCK = "flex flex-col grow min-w-0";
const LINE = "flex items-center min-w-0";
// A label with nothing under it keeps a rows inset above and below, so one that
// wraps has room; within the row's height a one-line label does not grow it.
const ALONE = "py-rows";
// The label wraps to the room its value leaves, never inside a word: its
// longest word is its floor, which the body's `overflow-wrap: anywhere` would
// make a letter, so the label sets `wrap-normal`.
const LABEL = "min-w-min wrap-normal shrink-10000000";
// A string gives way first: it takes the room the label leaves, ending at the
// line's end; an identifier too long for it cuts in its middle, its stem
// truncating to the room and its tail standing whole (`valueCut`); words are
// one text run that truncates at its end.
const VALUE = "flex basis-0 grow min-w-0 justify-end";
// A status stays whole and the label wraps to the room it leaves, down to its
// longest word: a status wider than three quarters of the line, or than the
// room that word leaves, is cut. The label's shrink dwarfs the status's, so it
// gives way first.
const VALUE_STATUS = "flex min-w-0 ms-auto max-w-3/4";
const STEM = "min-w-0 truncate";
const TAIL = "shrink-0";
// A control stands whole at the line's end, the label wrapping beside it.
const CONTROL = "flex shrink-0 ms-auto";
const ACTS = "relative flex shrink-0";
// The chevron draws in the slot's ink (currentColor).
const CHEVRON = "flex shrink-0 items-center justify-center text-ink-meta";
// A row with no act or link keeps that square empty, so every value in a Group
// ends at one x.
const NO_END = "shrink-0";

/** What a definition shows: a string (a word or a short phrase) or a status. */
export type DefinitionValue = DefinitionData;

interface DefinitionRowBase extends Closed {
	/** Where the fact stands in a change set: its mark at the row's start, ahead of the label. */
	change?: ChangeKind;
	/** What the fact is (a short phrase; wraps to the room its value leaves). */
	label: string;
	/** Words that are copied whole (an identifier): drawn in the code role with a copy act. */
	copyable?: boolean;
}

/** The fact's value, a constant or a selection (it paints, inert, until its read lands): a string (a word or a short phrase; truncates at its end, an identifier of one word over eight characters cuts in its middle) or a status; or a `switch` that changes it in place (the Switch's own props, named by the row's label); or a `pick` that chooses it in place (the options and the change, named by the row's label); never more than one. */
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

/** A labelled fact in a Group: editable here, or locked with its reason. */
export type DefinitionRowProps<V extends string | null = string> =
	DefinitionRowBase &
		DefinitionRowValue<V> &
		(
			| {
					locked?: never;
					/** Under the label and the value, at the row's width (a sentence; wraps). A selection paints, inert, until its read lands. */
					description?: Datum<string>;
					/** The row's one icon act at its end. */
					act?: IconAct;
					/** Where the row goes when opened; a chevron stands at its end. */
					href?: string;
					/** Opens what the row names; a chevron stands at its end. */
					onOpen?: () => void;
			  }
			| {
					/** The value outside its editable context: a lock after it and the reason under it, the whole line a link with an `href`. It takes no description, act or open. */
					locked: Lock;
					description?: never;
					act?: never;
					href?: never;
					onOpen?: never;
			  }
		);

/** What a `List` hands the row it draws while its items are not here; no app sets them, so they are outside `DefinitionRowProps`. */
export interface DefinitionRowInternal {
	/** The fact is not here: the label, the value, the description and the controls paint, the row is inert and builds no link. The slots are run over the placeholder, so they say which parts the loaded row has. */
	painted?: boolean;
	/** The row's place among the painted rows, which varies the filler's lengths. */
	at?: number;
}

function isStatus(
	value: DefinitionValue | undefined,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

/** The change mark at the start, the label at body 500, wrapping to the room its value leaves, with the value at the line's end (an identifier too long for its room cut in its middle, the whole value still its text; a `switch` or a `pick` whole, centred beside the label), the description under both; an icon act, or a link's chevron in the act's square, at the row's end, the square empty on a row with neither, so every value in a Group ends at one x. A locked row draws a lock after its value and its reason under both in the description's place, the whole line a link with an `href`. A `value` or `description` that is a selection paints in its place, and the row is inert, until its read lands. */
export function DefinitionRow<V extends string | null = string>(
	fact: DefinitionRowProps<V>,
) {
	return <DefinitionRowBase {...fact} />;
}

/** Every definition row: the public `DefinitionRow`, or the one a `List` paints. Outside the package's exports. */
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
	// Painted by the list, or by a datum of its own: either way the row draws
	// its loaded tree, each part the datum reaches in its filler, and takes no
	// press.
	const waitsValue = listed || shown.painted;
	const waitsUnder = listed || said.painted;
	const painted = waitsValue || waitsUnder;
	const opens = href !== undefined || onOpen !== undefined;
	const live = opens && !painted;
	// A placeholder is a function proxy that no type test passes: the value is
	// read only once painted is ruled out.
	const plain = waitsValue ? undefined : shown.value;
	const copied = copyable && typeof plain === "string" ? plain : undefined;
	let valueNode: ReactNode = null;
	if (waitsValue && value !== undefined)
		valueNode = isStatus(shown.value as DefinitionValue | undefined) ? (
			<span className={VALUE_STATUS}>
				<StatusBase painted />
			</span>
		) : (
			<span
				className={cn(
					text({ role: copyable ? "code" : "meta" }),
					FIGURES,
					VALUE,
				)}
			>
				<span className={STEM}>
					<Painted role={copyable ? "id" : "phrase"} at={at} />
				</span>
			</span>
		);
	else if (typeof plain === "string") {
		const { stem, tail } = valueCut(plain);
		valueNode = (
			<span
				className={cn(text({ role: copied ? "code" : "meta" }), FIGURES, VALUE)}
			>
				<span className={STEM}>{stem}</span>
				{tail ? <span className={TAIL}>{tail}</span> : null}
			</span>
		);
	} else if (isStatus(plain))
		valueNode = (
			<span className={VALUE_STATUS}>
				<StatusBase state={plain.status} label={plain.label} />
			</span>
		);
	else if (toggle)
		valueNode = (
			<span className={CONTROL}>
				<HeldSwitch {...toggle} label={listed ? "" : label} painted={painted} />
			</span>
		);
	else if (pick)
		valueNode = (
			<span className={CONTROL}>
				<PickerBase {...pick} fit="row" painted={painted} />
			</span>
		);
	const copy = copyable && waitsValue;
	let end: ReactNode;
	if (copy || copied !== undefined || act) {
		let acted: ReactNode = null;
		if (act)
			acted = listed ? (
				<IconButtonBase icon="Ellipsis" fit="bar" label="" painted />
			) : (
				<IconButton
					icon={act.icon}
					fit="bar"
					label={act.label}
					onAct={act.onAct}
					failed={act.failed}
				/>
			);
		end = (
			<span className={ACTS}>
				{copy ? (
					<IconButtonBase icon="Copy" fit="bar" label="" painted />
				) : copied === undefined ? null : (
					<CopyAct label={label} value={copied} />
				)}
				{acted}
			</span>
		);
	} else if (opens)
		end = (
			<span className={cn(DEFINITION_ROW_CHEVRON, CHEVRON)}>
				<Icon name="ChevronRight" />
			</span>
		);
	else
		end = <span aria-hidden className={cn(DEFINITION_ROW_CHEVRON, NO_END)} />;
	let under: ReactNode;
	if (locked) {
		if (listed) under = <Painted role="sentence" at={at} />;
		else if (locked.href === undefined) under = locked.reason;
		else
			under = (
				<Link href={locked.href} fit="standalone">
					{locked.reason}
				</Link>
			);
	} else if (description !== undefined) {
		under = waitsUnder ? (
			<Painted role="sentence" at={at} />
		) : (
			(said.value as string)
		);
	}
	const name = cn(
		text({ role: "body" }),
		textStrong({ role: "body" }),
		LABEL,
		!under && ALONE,
		live && HIT,
	);
	const named = listed ? <Painted role="name" at={at} /> : label;
	let title: ReactNode = <span className={name}>{named}</span>;
	if (live && href !== undefined)
		title = (
			<a href={href} onClick={follow} className={name}>
				{named}
			</a>
		);
	else if (live && onOpen)
		title = (
			<BaseButton onClick={onOpen} className={name}>
				{named}
			</BaseButton>
		);
	return (
		<div
			inert={painted || undefined}
			className={cn(
				row({
					lines: under ? "setting" : "one",
					state: "rest",
				}),
				DEFINITION_ROW,
				ROW,
				live && ROW_PRESS,
			)}
		>
			{change ? <ChangeMark kind={change} painted={listed} /> : null}
			<span className={TEXT_BLOCK}>
				<span className={cn(ROW_TITLE_LINE, LINE)}>
					{title}
					{valueNode}
					{locked ? <LockMark painted={listed} /> : null}
				</span>
				{under ? <span className={text({ role: "meta" })}>{under}</span> : null}
			</span>
			{end}
		</div>
	);
}

// The copy act: a check and the word Copied for two seconds once copied.
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
