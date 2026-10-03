import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { IconAct, StatusState } from "@fcalell/ui-core/descriptors";
import {
	DEFINITION_ROW,
	DEFINITION_ROW_CHEVRON,
	ROW_TITLE_LINE,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useCopy } from "../../lib/copy.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Status } from "../status/index.tsx";

const ROW = "relative flex items-center";
// A row that opens washes under the pointer and the press on its hit.
const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
// The label is the link: its after layer covers the row, so the whole row
// opens, and draws the ring inset at the row's edge.
const HIT =
	"after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring";
const TEXT_BLOCK = "flex flex-col grow min-w-0";
const LINE = "flex items-center min-w-0";
const LABEL = "truncate";
// The value gives way first: it takes the room the label leaves, ending at
// the line's end.
const VALUE = "basis-0 grow min-w-0 truncate text-end";
const VALUE_SLOT = "flex basis-0 grow min-w-0 justify-end";
const ACTS = "relative flex shrink-0";
// The chevron draws in the slot's ink (currentColor).
const CHEVRON = "flex shrink-0 items-center justify-center text-ink-meta";

/** What a definition shows: words, a status, or an in-place control. */
export type DefinitionValue =
	| string
	| { status: StatusState; label?: string }
	| ReactNode;

/** A labelled fact in a Group. */
export interface DefinitionRowProps extends Closed {
	/** What the fact is. */
	label: string;
	/** A sentence under the label and the value, at the row's width. */
	description?: string;
	/** The fact: words, a status, or a control that changes it in place. */
	value?: DefinitionValue;
	/** Words that are copied whole (an identifier): drawn in the code role with a copy act. */
	copyable?: boolean;
	/** The row's one icon act at its end. */
	act?: IconAct;
	/** Where the row goes when opened; a chevron stands at its end. */
	href?: string;
	/** Opens what the row names; a chevron stands at its end. */
	onOpen?: () => void;
}

function isStatus(
	value: DefinitionValue,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

/** The label at body 500 with the value at the line's end, the description under both; an icon act, or a link's chevron in the act's square, at the row's end, so values with either end at one x. */
export function DefinitionRow({
	label,
	description,
	value,
	copyable,
	act,
	href,
	onOpen,
}: DefinitionRowProps) {
	const opens = href !== undefined || onOpen !== undefined;
	const copied = copyable && typeof value === "string" ? value : undefined;
	let shown: ReactNode = null;
	if (typeof value === "string")
		shown = (
			<span className={cn(text({ role: copied ? "code" : "meta" }), VALUE)}>
				{value}
			</span>
		);
	else if (isStatus(value))
		shown = (
			<span className={VALUE_SLOT}>
				<Status state={value.status} label={value.label} />
			</span>
		);
	else if (value !== undefined && value !== null)
		shown = <span className={VALUE_SLOT}>{value}</span>;
	let end: ReactNode = null;
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
	const name = cn(
		text({ role: "body" }),
		textStrong({ role: "body" }),
		LABEL,
		opens && HIT,
	);
	let title: ReactNode = <span className={name}>{label}</span>;
	if (href !== undefined)
		title = (
			<a href={href} className={name}>
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
					lines: description ? "setting" : "one",
					state: "rest",
					ground: "group",
				}),
				DEFINITION_ROW,
				ROW,
				opens && ROW_PRESS,
			)}
		>
			<span className={TEXT_BLOCK}>
				<span className={cn(ROW_TITLE_LINE, LINE)}>
					{title}
					{shown}
				</span>
				{description ? (
					<span className={text({ role: "meta" })}>{description}</span>
				) : null}
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
