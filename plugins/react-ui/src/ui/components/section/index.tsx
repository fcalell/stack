import { Collapsible } from "@base-ui/react/collapsible";
import { cn } from "@fcalell/ui-core/cn";
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
	use,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { FormContext } from "../../lib/form.ts";
import { ThreadFills } from "../../lib/frame.ts";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { SectionContext } from "../../lib/section.ts";
import { useTouched } from "../../lib/touched.ts";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { Count } from "../count/index.tsx";
import { Group } from "../group/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { List } from "../list/index.tsx";
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
const ACT_SLOT = "flex items-center shrink-0";
const BODY = "flex flex-col";
const COUNT_WAIT = "inline-flex shrink-0";
const FIELD_WAIT = "flex flex-col";
// The label line at the length of a field label.
const LABEL_WAIT = "w-1/4";
// The loading fields: a body of fields waits as three.
const FIELDS = ["first", "second", "third"];

function partText(part: Part): string {
	return typeof part === "string" ? part : `“${part.quoted}”`;
}

/** A titled region of a page over its rows. */
export interface SectionProps extends Closed {
	/** The heading. */
	title: Part;
	/** How many things the body holds, in a grey pill after the title. */
	count?: number;
	/** A sentence under the title. */
	description?: string;
	/** Set, the title folds the body: `true` starts folded, `false` open. */
	folded?: boolean;
	/** Called as a foldable section opens or closes, with whether it is now open. */
	onToggle?: (open: boolean) => void;
	/** The section's one act, at the head's end: a labelled act or an icon act. */
	act?: Act | IconAct;
	/** The count (when there is one) and the body wait: a Group or a List in the body draws its own skeleton rows, and skeleton fields stand in for any other body. */
	loading?: boolean;
	/** The body: a Group, a List, or the rows a Form lays out. */
	children?: ReactNode;
}

/** A heading with its count, description and act over its body; the title folds the body when `folded` is set. A blocked act's reason draws under the head row, which never moves. */
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
	const level = use(HeadingContext);
	// Inside a Form the section takes the fields rhythm.
	const within = use(FormContext) ? "form" : "page";
	const nodes = Children.toArray(children);
	const rows = nodes.some(
		(node) =>
			isValidElement(node) && (node.type === Group || node.type === List),
	);
	const Heading = `h${level}` as const;
	const titleId = useId();
	const reasonId = useId();
	const bodyId = useId();
	const { touched } = useTouched();
	const blocked =
		act !== undefined && "blocked" in act ? act.blocked : undefined;
	const [open, setOpen] = useState(folded !== true);
	const [pressed, setPressed] = useState(false);
	// A QueryBoundary in the body waits through the Section: it draws its
	// rows waiting, the Section its busy head.
	const [waiting, setWaiting] = useState(false);
	const busy = loading === true || waiting;
	useEffect(() => {
		if (blocked === undefined) setPressed(false);
	}, [blocked]);
	const host = useMemo(
		() =>
			blocked === undefined
				? undefined
				: { id: reasonId, press: () => setPressed(true) },
		[blocked, reasonId],
	);
	// A count waits with the body.
	let tally: ReactNode = null;
	if (count !== undefined)
		tally = busy ? (
			<span
				aria-hidden
				className={cn(skeleton({ kind: "count" }), COUNT_WAIT)}
			/>
		) : (
			<Count value={count} />
		);
	const name = (
		<>
			<span id={titleId} className={cn(text({ role: "heading" }), TITLE)}>
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
			className={cn(section({ in: within }), BOX)}
		>
			<div className={cn(SECTION_HEAD, HEAD)}>
				<div
					className={cn(
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
						{description ? <Text role="meta">{description}</Text> : null}
					</div>
					{act ? (
						<div className={ACT_SLOT}>
							{"icon" in act ? (
								<IconButton
									icon={act.icon}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
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
						</div>
					) : null}
				</div>
				{blocked === undefined ? null : (
					<Reason id={reasonId} shown={pressed || touched} end>
						{blocked}
					</Reason>
				)}
			</div>
			{/* Kept mounted while folded and named on the toggle, so its `aria-controls` resolves in either state (Base UI names it only while open). A section without children draws no body. */}
			{nodes.length === 0 ? null : (
				<Collapsible.Panel
					id={bodyId}
					keepMounted
					className={cn(section({ in: within }), BODY)}
				>
					<HeadingContext value={DEEPER[level]}>
						{loading && !rows ? (
							FIELDS.map((key) => (
								<div
									key={key}
									aria-hidden
									className={cn(skeletonRow({ kind: "field" }), FIELD_WAIT)}
								>
									<span
										className={cn(skeleton({ kind: "line" }), LABEL_WAIT)}
									/>
									<span className={skeleton({ kind: "field" })} />
								</div>
							))
						) : (
							<LoadingContext value={loading === true}>
								<SectionContext value={setWaiting}>
									<ThreadFills value={null}>{children}</ThreadFills>
								</SectionContext>
							</LoadingContext>
						)}
					</HeadingContext>
				</Collapsible.Panel>
			)}
		</Collapsible.Root>
	);
}
