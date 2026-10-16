import { Collapsible } from "@base-ui/react/collapsible";
import type { Datum, Selection } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	IconAct,
	MenuItem,
	Part,
} from "@fcalell/ui-core/descriptors";
import { SECTION, SECTION_BODY } from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import { FrameBody, useFrame } from "../../lib/read.tsx";
import { useSettleName } from "../../lib/settle.ts";
import { SectionHead } from "./head.tsx";

const BOX = "flex flex-col min-w-0";
const BODY = "flex flex-col";

interface SectionBase extends Closed {
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
	/** The section's one act, at the head's end: a labelled act or an icon act. It is live whatever the `read` does. Given as a selection it paints, inert, while its own read waits or stands still, and stands blocked with the failed sentence once that read failed or is missing. */
	act?: Datum<Act | IconAct>;
	/** The section's other acts, in a menu under the more act after its act (destructive ones marked); the head row never moves, and a foldable section's more does not fold it. It paints and stands blocked as the act does. */
	more?: Datum<readonly MenuItem[]>;
	/** The body: a Group, a List, a Form or any other parts; none stand while the `read` is empty. */
	children?: ReactNode;
}

/** A titled stretch of a page over its rows. `empty` belongs to the `read` it answers for, so a Section given one without the other does not type-check. */
export type SectionProps = SectionBase &
	(
		| {
				read?: undefined;
				empty?: never;
		  }
		| {
				/** What the section's body holds, read once for the frame: while it waits the body's leaves paint, its failure and a missing record stand in the body's place, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait, empty and count. */
				read: Selection<unknown>;
				/** What the body says when the `read` is empty: this stands in the body's place, framed, or as one quiet sentence when only the sentence is given. */
				empty?: Empty;
		  }
	);

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
	children,
}: SectionProps) {
	const settle = useSettleName();
	const frame = useFrame(read);
	const level = use(HeadingContext);
	const bodyId = useId();
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	const body =
		read === undefined ? (
			children
		) : (
			<FrameBody frame={frame} fit="frame" empty={empty}>
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
			<SectionHead
				title={title}
				count={count}
				description={description}
				act={act}
				more={more}
				foldable={folded !== undefined}
				open={open}
				bodyId={bodyId}
				frame={frame}
			/>
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
