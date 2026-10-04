import { Collapsible } from "@base-ui/react/collapsible";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconAct, Part } from "@fcalell/ui-core/descriptors";
import { sectionCount } from "@fcalell/ui-core/list-state";
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
import {
	type ReactNode,
	use,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { FormContext } from "../../lib/form.ts";
import { ThreadFills } from "../../lib/frame.ts";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { SectionContext, type SectionHost } from "../../lib/section.ts";
import { useTouched } from "../../lib/touched.ts";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
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
// The waiting count stands at a one-figure pill's width: the pill's padding
// round an unseen figure at the pill's type.
const COUNT_WAIT = "inline-flex shrink-0 items-center px-inside";
const FIGURE_WAIT = "opacity-0 tabular-nums";
const FIELD_WAIT = "flex flex-col";
// The label line at the length of a field label.
const LABEL_WAIT = "w-1/4";
// The label's bar stands in the label's line box, at its line height.
const LABEL_LINE = "flex items-center h-lh";
// A loading body of fields waits as one skeleton per field it registered, or
// as three when nothing registered (content other than fields).
const FALLBACK_FIELDS = 3;

// How many field skeletons a loading body waits as: none when it holds rows.
function waitAs(rows: number, fields: number): number {
	return rows === 0 ? fields || FALLBACK_FIELDS : 0;
}

function partText(part: Part): string {
	return typeof part === "string" ? part : `“${part.quoted}”`;
}

/** A titled region of a page over its rows. */
export interface SectionProps extends Closed {
	/** The heading. */
	title: Part;
	/** A total the body's lists do not hold, in a grey pill after the title; without it a List in the body counts its items there. */
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
	const Heading = `h${level}` as const;
	const titleId = useId();
	const reasonId = useId();
	const bodyId = useId();
	const { touched } = useTouched();
	const blocked =
		act !== undefined && "blocked" in act ? act.blocked : undefined;
	const [open, setOpen] = useState(folded !== true);
	const [pressed, setPressed] = useState(false);
	// A QueryBoundary or a List's query in the body waits through the
	// Section: it draws its rows waiting, the Section its busy head until
	// every waiter settles.
	// A List in it reports its item count, the Section's count unless it has
	// its own.
	const [waiters, setWaiters] = useState(0);
	const [listed, setListed] = useState<ReadonlyMap<string, number | undefined>>(
		() => new Map(),
	);
	// A loading body draws its own rows when a Group or a List in it (however
	// deep) registers; with none, the body waits as fields. The body renders
	// once to learn, and the swap lands in a synchronous re-render before
	// paint, so the swap is never painted; a registration or a release while
	// loading checks again (the only List unmounting leaves fields).
	const rowBodies = useRef(0);
	const loadingNow = useRef(loading === true);
	const fieldBodies = useRef(0);
	// How many field skeletons the body waits as; none while it draws itself.
	const [fields, setFields] = useState(0);
	const parts = useMemo<SectionHost>(
		() => ({
			wait: () => {
				setWaiters((waiting) => waiting + 1);
				return () => setWaiters((waiting) => waiting - 1);
			},
			count: (id, value) => {
				setListed((counts) => new Map(counts).set(id, value));
				return () =>
					setListed((counts) => {
						const next = new Map(counts);
						next.delete(id);
						return next;
					});
			},
			rows: () => {
				const recheck = () => {
					if (loadingNow.current)
						setFields(waitAs(rowBodies.current, fieldBodies.current));
				};
				rowBodies.current += 1;
				recheck();
				return () => {
					rowBodies.current -= 1;
					recheck();
				};
			},
			field: () => {
				fieldBodies.current += 1;
				return () => {
					fieldBodies.current -= 1;
				};
			},
		}),
		[],
	);
	useLayoutEffect(() => {
		loadingNow.current = loading === true;
		setFields(
			loading === true ? waitAs(rowBodies.current, fieldBodies.current) : 0,
		);
	}, [loading]);
	const busy = loading === true || waiters > 0;
	const lists = [...listed.values()];
	const counted = count !== undefined || lists.length > 0;
	const shown = sectionCount(count, lists);
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
	if (counted && busy)
		tally = (
			<span aria-hidden className={cn(skeleton({ kind: "count" }), COUNT_WAIT)}>
				<span className={cn(text({ role: "caption" }), FIGURE_WAIT)}>0</span>
			</span>
		);
	else if (shown !== undefined) tally = <Count value={shown} />;
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
			{children === undefined || children === null ? null : (
				<Collapsible.Panel
					id={bodyId}
					keepMounted
					className={cn(section({ in: within }), BODY)}
				>
					<HeadingContext value={DEEPER[level]}>
						{loading && fields > 0 ? (
							Array.from(
								{ length: fields },
								(_, index) => `field-${index}`,
							).map((key) => (
								<div
									key={key}
									aria-hidden
									className={cn(skeletonRow({ kind: "field" }), FIELD_WAIT)}
								>
									<span className={cn(lineBox({ role: "body" }), LABEL_LINE)}>
										<span
											className={cn(skeleton({ kind: "line" }), LABEL_WAIT)}
										/>
									</span>
									<span className={skeleton({ kind: "field" })} />
								</div>
							))
						) : (
							<LoadingContext value={loading === true}>
								<SectionContext value={parts}>
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
