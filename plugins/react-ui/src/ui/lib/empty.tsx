import { cn } from "@fcalell/ui-core/cn";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import {
	CARD_PART,
	EMPTY_LINE,
	EMPTY_PART,
	EMPTY_SENTENCE,
	text,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { ActFace } from "../components/button/face.tsx";
import { Icon } from "../components/icon/index.tsx";
import type { Act } from "./act.ts";
import { PageTitle } from "./frame.ts";

/** Where an empty state stands: `part` inside the card whose rows it stands for (a Section's sheet, a Form's, a Sheet's body), at the card's inset; `frame` on a card of its own (a Section's or a Pane's body). The drawer that owns the card says which. */
export type EmptyFit = "part" | "frame";

// A chart's loaded height keeps its height; the line stands at its top start.
const FILL = "grow";
const MARK = "inline-flex items-center shrink-0 text-danger";

/** What a frame says when the read it holds is empty: the sentence, and the act that makes the first one. It stands only for the frame's own read, so a frame given none has no empty state. */
export interface Empty {
	/** What is missing and what the act makes (a sentence; wraps). */
	sentence: string;
	/** The way to make the first one: an act that runs, or a `{ label, href }` that goes to a route (an anchor), either drawn as the create act. */
	act?: Act | LinkAct;
}

/** The empty state every empty `Pane`, `Section` and collection, a failed read and a missing one draw: one sentence in the meta ink at the body role over its act as an outlined button, both centred, at a card's inset: inside the card it stands for, or on a card of its own. Outside the package's exports: `fit` and `tone` are the drawers' alone. */
export function EmptyBase(props: {
	fit: EmptyFit;
	tone: "rest" | "failed" | "missing";
	// None is the Section's empty that offers an act in place of a sentence.
	sentence?: string;
	// A missing form's way back goes to a route, so it is a link; so is a create
	// act that navigates.
	act?: Act | LinkAct;
	// The line fills the box it stands in and stands at its top start (a
	// chart's loaded height).
	fill?: boolean;
	// A failed form that stands for its Pane (a Pane's own frame).
	headed?: boolean;
}) {
	// A missing form where its Pane has no title is the heading that names the
	// Pane, as the Pane's `h2`: the title of a record that is not there never
	// lands. So is a Pane's failed form, whose title's read failed with it.
	const headed =
		(props.tone === "missing" || (props.tone === "failed" && props.headed)) &&
		use(PageTitle) === undefined;
	const Heading = "h2" as const;
	const look = cn(text({ role: "body" }), EMPTY_SENTENCE);
	const sentence =
		props.sentence === undefined ? null : headed ? (
			<Heading className={look}>{props.sentence}</Heading>
		) : (
			<span className={look}>{props.sentence}</span>
		);
	return (
		<div
			className={cn(
				EMPTY_LINE,
				props.fit === "part" ? EMPTY_PART : CARD_PART,
				props.fill && FILL,
			)}
		>
			{/* Only a failed read draws a mark: the alert. */}
			{props.tone === "failed" ? (
				<span className={MARK}>
					<Icon name="CircleAlert" fit="control" />
				</span>
			) : null}
			{sentence}
			{props.act ? <ActFace act={props.act} kind="secondary" /> : null}
		</div>
	);
}
