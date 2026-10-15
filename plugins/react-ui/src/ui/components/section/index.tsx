import { Collapsible } from "@base-ui/react/collapsible";
import {
	type Datum,
	type Selection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
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
import { type ReactNode, use, useId, useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { EmptyBase, type EmptyProps } from "../../lib/empty.tsx";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import { Painted } from "../../lib/paint.tsx";
import { BusyMark, FrameBody, FrameLine, useFrame } from "../../lib/read.tsx";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useSettleName } from "../../lib/settle.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Reason } from "../button/reason.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { MenuBase } from "../menu/base.tsx";
import { Text } from "../text/index.tsx";

const BOX = "flex flex-col min-w-0";
const HEAD = "flex flex-col";
const HEAD_ROW = "flex items-center";
// On touch a labelled act that would squeeze the title column wraps under the
// title: the column's basis is its own width, so the row breaks once the
// title, its count and its description cannot stand beside the act.
const WRAP = "touch:flex-wrap";
const TITLE_BLOCK = "flex flex-col grow shrink-10000000 min-w-0";
const TITLE_LINE = "flex items-center min-w-0";
const TITLE_FOLD = "flex min-w-0";
const TITLE = "truncate";
// The chevron draws in the toggle's ink (currentColor), stepping to the body
// ink under the pointer.
const TOGGLE =
	"flex items-center grow min-w-0 -ms-inside text-start text-ink-meta hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
// The act and the more stand a row's act gap apart (`SECTION_ACTS`, as ListRow's).
const ACT_SLOT = "flex items-center min-w-0 max-w-full";
const BODY = "flex flex-col";
function partText(part: Part): string {
	return typeof part === "string" ? part : `“${part.quoted}”`;
}

/** A titled stretch of a page over its rows. */
export interface SectionProps extends Closed {
	/** The heading (a short phrase; truncates). */
	title: Part;
	/** The body's total, in the muted ink after the title; none is drawn without it, at zero (the body's empty state says so) or while the section waits. With a `read` of an array the total is the array's length once it lands, so none is given. */
	count?: number;
	/** Under the title (a sentence; wraps). It paints where it will stand while its selection waits; `""` and an undefined one draw no line. */
	description?: Datum<string>;
	/** Set, the title folds the body, and this is its initial fold: `true` starts folded, `false` open; later changes are not read. */
	folded?: boolean;
	/** Called as a foldable section opens or closes, with whether it is now open. */
	onToggle?: (open: boolean) => void;
	/** The section's one act, at the head's end: a labelled act or an icon act. It paints, inert, while the `read` waits or its own selection does. */
	act?: Datum<Act | IconAct>;
	/** The section's other acts, in a menu under the more act after its act (destructive ones marked); the head row never moves, and a foldable section's more does not fold it. It paints, inert, as the act does. */
	more?: Datum<readonly MenuItem[]>;
	/** What the section's body holds, read once for the frame: while it waits the body's leaves paint, its failure and a missing record stand in the body's place, and an empty selection draws `empty`. A read (the root) draws its failure and says it is busy; a selection draws only its wait, its emptiness and its count. */
	read?: Selection<unknown>;
	/** The section holds nothing yet: this stands in its body's place, framed, or as one quiet sentence when only the sentence is given. With a `read` it stands only when the selection is empty. */
	empty?: EmptyProps;
	/** What the body says when the `read` fails, in place of the generic sentence (a sentence; wraps). */
	failed?: string;
	/** The body: a Group, a List, a Form or any other parts; none stand while `empty` is set. */
	children?: ReactNode;
}

/** A heading with its count, description, act and more act over its body; the title folds the body when `folded` is set, at the heading size folded or not. A blocked act's reason draws under the head row, which never moves. No Section stands in a Section: the body's parts are rows, groups, fields and prose. It is a `section` with no name, so no landmark of its own (a `section` is a region only when named): the `Pane` is the page's named region, and a Section titled as its Pane is not a second region of that name. */
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
	const settle = useSettleName();
	const frame = useFrame(read);
	const [said, shownAct, shownMore] = useSelections([description, act, more]);
	const level = use(HeadingContext);
	const Heading = `h${level}` as const;
	const bodyId = useId();
	const { touched } = useTouched();
	const words = useWords();
	const given = shownAct.painted ? undefined : shownAct.value;
	const blocked =
		given !== undefined && "blocked" in given ? given.blocked : undefined;
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	let sentence: ReactNode = null;
	if (said.painted)
		sentence = (
			<Text role="meta">
				<Painted role="sentence" />
			</Text>
		);
	else if (said.value) sentence = <Text role="meta">{said.value}</Text>;
	// A count is not drawn while its body waits: a painted chip would carry an
	// unseen "0" for a number nobody knows yet, and the count arrives at the
	// title's end, where it moves nothing. A read of an array gives its length.
	const total = frame.waits ? undefined : (frame.count ?? count);
	const tally =
		total !== undefined && total !== 0 ? <Count value={total} /> : null;
	// The acts paint, inert, while the read waits or their own datum does. A
	// selection's shape is unknown until it lands, so its paint is a labelled act.
	const labelled =
		shownAct.painted || (given !== undefined && !("icon" in given));
	let actNode: ReactNode = null;
	if (shownAct.painted)
		actNode = (
			<ButtonBase act="secondary" fit="bar" label={paintText("word")} painted />
		);
	else if (given !== undefined && "icon" in given)
		actNode = frame.waits ? (
			<IconButtonBase icon={given.icon} fit="bar" label={given.label} painted />
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
			<ReasonHostContext value={host}>
				<ButtonBase
					act={given.destructive ? "destructive" : "secondary"}
					fit="bar"
					label={given.label}
					onAct={given.onAct}
					failed={given.failed}
					blocked={given.blocked}
					painted={frame.waits}
				/>
			</ReasonHostContext>
		);
	const items = shownMore.painted ? [] : (shownMore.value ?? []);
	const name = (
		<>
			<span className={cn(text({ role: "heading" }), TITLE)}>
				{partText(title)}
			</span>
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
		<Collapsible.Root
			render={<section />}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				onToggle?.(next);
			}}
			aria-busy={(frame.holds && frame.form === "waiting") || undefined}
			style={settle}
			className={cn(SECTION, BOX)}
		>
			<div className={cn(SECTION_HEAD, HEAD)}>
				<div
					className={cn(
						SECTION_BODY,
						SECTION_HEAD_ROW,
						HEAD_ROW,
						labelled && WRAP,
					)}
				>
					<div className={TITLE_BLOCK}>
						{folded === undefined ? (
							<Heading className={cn(SECTION_TITLE, TITLE_LINE)}>
								{name}
							</Heading>
						) : (
							<Heading className={TITLE_FOLD}>
								<Collapsible.Trigger
									aria-controls={bodyId}
									className={cn(SECTION_TOGGLE, TOGGLE)}
								>
									{name}
									<Icon name={open ? "ChevronDown" : "ChevronRight"} />
								</Collapsible.Trigger>
							</Heading>
						)}
						{sentence}
					</div>
					{actNode || shownMore.painted || items.length ? (
						<div className={cn(SECTION_ACTS, ACT_SLOT)}>
							{actNode}
							{shownMore.painted || items.length ? (
								<MenuBase
									label={`${words.more} ${partText(title)}`}
									title={partText(title)}
									items={items}
									painted={shownMore.painted || frame.waits}
								/>
							) : null}
						</div>
					) : null}
				</div>
				<FrameLine frame={frame} />
				{blocked === undefined ? null : (
					<Reason shown={pressed || touched} end>
						{blocked}
					</Reason>
				)}
			</div>
			{/* Kept mounted while folded, so its `aria-controls` resolves in either state (Base UI names it only while open) and what the body holds (a field's text, a fold inside) keeps its state. A section without children draws no body. */}
			{body === undefined || body === null ? null : (
				<Collapsible.Panel
					id={bodyId}
					keepMounted
					className={cn(SECTION_BODY, BODY)}
				>
					<HeadingContext value={DEEPER[level]}>{body}</HeadingContext>
				</Collapsible.Panel>
			)}
		</Collapsible.Root>
	);
}
