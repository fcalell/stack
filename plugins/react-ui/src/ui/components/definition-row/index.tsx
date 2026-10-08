import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type {
	ChangeKind,
	DefinitionData,
	IconAct,
	Lock,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import { definitionShape, valueCut } from "@fcalell/ui-core/list-state";
import {
	DEFINITION_ROW,
	DEFINITION_ROW_CHEVRON,
	ROW_TITLE_LINE,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { isValidElement, type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useCopy } from "../../lib/copy.ts";
import { useGroupPart } from "../../lib/group.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { follow } from "../../lib/navigate.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Link } from "../link/index.tsx";
import { LockMark } from "../list-row/lock.tsx";
import { ChangeMark } from "../status/change.tsx";
import { Status } from "../status/index.tsx";
import { DefinitionWait } from "./wait.tsx";

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
// The label wraps to the room its value leaves.
const LABEL = "min-w-0 wrap-break-word";
// A string or a status gives way first: it takes the room the label leaves,
// ending at the line's end; an identifier too long for it cuts in its middle, its stem
// truncating to the room and its tail standing whole (`valueCut`); words are
// one text run that truncates at its end.
const VALUE = "flex basis-0 grow min-w-0 justify-end";
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

/** What a definition shows: words, a status, or an in-place control. */
export type DefinitionValue = DefinitionData | ReactNode;

interface DefinitionRowBase extends Closed {
	/** Where the fact stands in a change set: its mark at the row's start, ahead of the label. */
	change?: ChangeKind;
	/** What the fact is. */
	label: string;
	/** The fact: words, a status, or a control that changes it in place. */
	value?: DefinitionValue;
	/** Words that are copied whole (an identifier): drawn in the code role with a copy act. */
	copyable?: boolean;
}

/** A labelled fact in a Group: editable here, or locked with its reason. */
export type DefinitionRowProps = DefinitionRowBase &
	(
		| {
				locked?: never;
				/** A sentence under the label and the value, at the row's width. */
				description?: string;
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

function isStatus(
	value: DefinitionValue,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

/** The change mark at the start, the label at body 500, wrapping to the room its value leaves, with the value at the line's end (an identifier too long for its room cut in its middle, the whole value still its text; a control whole, centred beside the label), the description under both; an icon act, or a link's chevron in the act's square, at the row's end, the square empty on a row with neither, so every value in a Group ends at one x. A locked row draws a lock after its value and its reason under both in the description's place, the whole line a link with an `href`. It waits through its Group or Section, drawing the form of the row it is given. */
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
	// In a waiting Group or Section the row draws its waiting form, built from
	// what it is given: a control as its value stands as the switch's box.
	const waiting = use(LoadingContext);
	useGroupPart();
	if (waiting) {
		const shape = definitionShape({
			change,
			description,
			locked,
			copyable,
			act,
			href,
			onOpen,
		});
		return (
			<DefinitionWait
				shape={isValidElement(value) ? { ...shape, end: "switch" } : shape}
				index={0}
			/>
		);
	}
	const opens = href !== undefined || onOpen !== undefined;
	const copied = copyable && typeof value === "string" ? value : undefined;
	let shown: ReactNode = null;
	if (typeof value === "string") {
		const { stem, tail } = valueCut(value);
		shown = (
			<span className={cn(text({ role: copied ? "code" : "meta" }), VALUE)}>
				<span className={STEM}>{stem}</span>
				{tail ? <span className={TAIL}>{tail}</span> : null}
			</span>
		);
	} else if (isStatus(value))
		shown = (
			<span className={VALUE}>
				<Status state={value.status} label={value.label} />
			</span>
		);
	else if (value !== undefined && value !== null)
		shown = <span className={CONTROL}>{value}</span>;
	let end: ReactNode;
	if (copied !== undefined || act)
		end = (
			<span className={ACTS}>
				{copied === undefined ? null : <CopyAct label={label} value={copied} />}
				{act ? (
					<IconButton
						icon={act.icon}
						fit="bar"
						label={act.label}
						onAct={act.onAct}
					/>
				) : null}
			</span>
		);
	else if (opens)
		end = (
			<span className={cn(DEFINITION_ROW_CHEVRON, CHEVRON)}>
				<Icon name="ChevronRight" />
			</span>
		);
	else
		end = <span aria-hidden className={cn(DEFINITION_ROW_CHEVRON, NO_END)} />;
	let under: ReactNode = description;
	if (locked)
		under =
			locked.href === undefined ? (
				locked.reason
			) : (
				<Link href={locked.href} fit="standalone">
					{locked.reason}
				</Link>
			);
	const name = cn(
		text({ role: "body" }),
		textStrong({ role: "body" }),
		LABEL,
		!under && ALONE,
		opens && HIT,
	);
	let title: ReactNode = <span className={name}>{label}</span>;
	if (href !== undefined)
		title = (
			<a href={href} onClick={follow} className={name}>
				{label}
			</a>
		);
	else if (onOpen)
		title = (
			<BaseButton onClick={onOpen} className={name}>
				{label}
			</BaseButton>
		);
	return (
		<div
			className={cn(
				row({
					lines: under ? "setting" : "one",
					state: "rest",
					ground: "group",
				}),
				DEFINITION_ROW,
				ROW,
				opens && ROW_PRESS,
			)}
		>
			{change ? <ChangeMark kind={change} /> : null}
			<span className={TEXT_BLOCK}>
				<span className={cn(ROW_TITLE_LINE, LINE)}>
					{title}
					{shown}
					{locked ? <LockMark /> : null}
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
