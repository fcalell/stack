import { Collapsible } from "@base-ui/react/collapsible";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	IconAct,
	MenuItem,
	Part,
} from "@fcalell/ui-core/descriptors";
import {
	lineBox,
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
import { type ReactNode, use, useId, useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FormStands } from "../../lib/form.ts";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import { LoadingContext, useWait, VEIL } from "../../lib/loading.ts";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { SectionContext } from "../../lib/section.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
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
const TITLE_BLOCK = "flex flex-col grow min-w-0";
const TITLE_LINE = "flex items-center min-w-0";
const TITLE_FOLD = "flex min-w-0";
const TITLE = "truncate";
// The chevron draws in the toggle's ink (currentColor), stepping to the body
// ink under the pointer.
const TOGGLE =
	"flex items-center grow min-w-0 -ms-inside text-start text-ink-meta hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
// The act and the more stand a row's act gap apart (`SECTION_ACTS`, as ListRow's).
const ACT_SLOT = "flex items-center shrink-0";
const BODY = "flex flex-col";
// The description's bar stands in the meta line's box, at the sentence's half measure.
const DESCRIPTION_LINE = "flex items-center h-lh";
function partText(part: Part): string {
	return typeof part === "string" ? part : `“${part.quoted}”`;
}

/** A titled region of a page over its rows. */
export interface SectionProps extends Closed {
	/** The heading (a short phrase; truncates). */
	title: Part;
	/** The body's total, in the muted ink after the title; none is drawn without it, at zero (the body's empty state says so) or while the section loads. */
	count?: number;
	/** Under the title (a sentence; wraps). While the Section loads, `""` stands one meta-height bar where the sentence will be and an undefined `description` stands none; loaded, `""` draws no line, as an undefined one. */
	description?: string;
	/** Set, the title folds the body, and this is its initial fold: `true` starts folded, `false` open; later changes are not read. */
	folded?: boolean;
	/** Called as a foldable section opens or closes, with whether it is now open. */
	onToggle?: (open: boolean) => void;
	/** The section's one act, at the head's end: a labelled act or an icon act. */
	act?: Act | IconAct;
	/** The section's other acts, in a menu under the more act after its act (destructive ones marked); the head row never moves, and a foldable section's more does not fold it. */
	more?: readonly MenuItem[];
	/** The head is busy and the body waits: the count (when there is one) is undrawn, and each part of the body draws its own waiting form (a Group or a List its skeleton rows, a Prose, Thread, Code, Meter, Slider, DefinitionRow, FormField or ActionBar its own); the section reads nothing else, so a body no part answers for draws as it is. */
	loading?: boolean;
	/** The body: a Group, a List, a Form or any other parts. */
	children?: ReactNode;
}

/** A heading with its count, description, act and more act over its body; the title folds the body when `folded` is set. A blocked act's reason draws under the head row, which never moves. */
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
	const level = use(HeadingContext);
	// A Section inside a Section names itself a level below its parent.
	const nested = use(SectionContext);
	// A section in a sheet's body reads a level below the sheet's title.
	const stood = use(FormStands) === "sheet";
	const Heading = `h${level}` as const;
	const titleId = useId();
	const bodyId = useId();
	const { touched } = useTouched();
	const words = useWords();
	const blocked =
		act !== undefined && "blocked" in act ? act.blocked : undefined;
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	const [pressed, press] = usePressed(blocked);
	// The head is busy exactly while the section loads; its count is the one it
	// is given.
	const busy = loading === true;
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	// The description waits as a bar only when the Section says it will have
	// one: an empty string, which is no line once loaded.
	let sentence: ReactNode = null;
	if (description) sentence = <Text role="meta">{description}</Text>;
	else if (loading === true && description === "")
		sentence = (
			<span
				aria-hidden
				className={cn(lineBox({ role: "meta" }), DESCRIPTION_LINE, veil)}
			>
				<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
			</span>
		);
	// A count is not drawn while its body waits: a skeleton chip would carry an
	// unseen "0" for a number nobody knows yet, and the count arrives at the
	// title's end, where it moves nothing.
	const tally =
		count !== undefined && !busy && count !== 0 ? (
			<Count value={count} />
		) : null;
	const name = (
		<>
			<span
				id={titleId}
				className={cn(
					nested || stood || folded !== undefined
						? SECTION_NESTED_TITLE
						: text({ role: "heading" }),
					TITLE,
				)}
			>
				{partText(title)}
			</span>
			{tally}
		</>
	);
	return (
		<Collapsible.Root
			render={<section />}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				onToggle?.(next);
			}}
			aria-labelledby={titleId}
			aria-busy={busy || undefined}
			className={cn(SECTION, BOX)}
		>
			<div className={cn(SECTION_HEAD, HEAD)}>
				<div
					className={cn(
						SECTION_BODY,
						SECTION_HEAD_ROW,
						HEAD_ROW,
						act && !("icon" in act) && WRAP,
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
					{act || more?.length ? (
						<div className={cn(SECTION_ACTS, ACT_SLOT)}>
							{act === undefined ? null : "icon" in act ? (
								<IconButton
									icon={act.icon}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
									loading={act.loading}
								/>
							) : (
								<ReasonHostContext value={host}>
									<Button
										act={act.destructive ? "destructive" : "secondary"}
										fit="bar"
										label={act.label}
										onAct={act.onAct}
										loading={act.loading}
										blocked={act.blocked}
									/>
								</ReasonHostContext>
							)}
							{more?.length ? (
								<MenuBase
									label={`${words.more} ${partText(title)}`}
									title={partText(title)}
									items={more}
								/>
							) : null}
						</div>
					) : null}
				</div>
				{blocked === undefined ? null : (
					<Reason shown={pressed || touched} end>
						{blocked}
					</Reason>
				)}
			</div>
			{/* Kept mounted while folded, so its `aria-controls` resolves in either state (Base UI names it only while open) and what the body holds (a field's text, a fold inside) keeps its state. A section without children draws no body. */}
			{children === undefined || children === null ? null : (
				<Collapsible.Panel
					id={bodyId}
					keepMounted
					className={cn(SECTION_BODY, BODY, veil)}
				>
					<HeadingContext value={DEEPER[level]}>
						<LoadingContext value={loading === true}>
							<SectionContext value={true}>{children}</SectionContext>
						</LoadingContext>
					</HeadingContext>
				</Collapsible.Panel>
			)}
		</Collapsible.Root>
	);
}
