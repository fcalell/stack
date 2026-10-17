import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconName, LinkAct } from "@fcalell/ui-core/descriptors";
import {
	EMPTY_COLUMN,
	EMPTY_FRAME,
	EMPTY_MARK,
	EMPTY_TEXT,
	text,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { ButtonBase } from "../components/button/base.tsx";
import { ButtonLink } from "../components/button/link.tsx";
import { Icon } from "../components/icon/index.tsx";
import { Text } from "../components/text/index.tsx";
import { PageTitle } from "./frame.ts";

// Alone in a page body it fills what the body leaves and centres there.
const ALONE = "flex grow items-center justify-center";
const COLUMN = "flex flex-col items-center text-center";
const FRAME = "flex justify-center";
const FILL = "grow items-center";
const MARK = "inline-flex items-center justify-center shrink-0";
const DANGER = "text-danger";
const TEXT = "flex flex-col items-center";
const MEASURE = "max-w-measure";

/** What a frame says when the read it holds is empty: the sentence, and the act that makes the first one. It stands only for the frame's own read, so a frame given none has no empty state. */
export interface Empty {
	/** What is missing and what the act makes (a sentence; wraps). */
	sentence: string;
	/** The way to make the first one. */
	act?: Act;
}

/** The form an empty state draws, by the drawer that stands it: a `Pane`'s `page` (centred in what the body leaves), a `Section`'s or a collection's `frame` (a hairline frame, or one quiet sentence when only that is given). */
export type EmptyFit = "page" | "frame";

/** The empty state every empty `Pane`, `Section` and collection, a failed read and a missing one draw: the sentence and the act. Outside the package's exports: `fit` and `tone` are the drawers' alone. */
export function EmptyBase(props: {
	fit: EmptyFit;
	tone: "rest" | "failed" | "missing";
	sentence: string;
	// A missing form's way back goes to a route, so it is a link.
	act?: Act | LinkAct;
	// The frame fills the box it stands in, its content centred there (a
	// chart's loaded height).
	fill?: boolean;
}) {
	const framed = props.fit === "frame";
	// A missing form where no Pane has a title to head the page is the page's
	// `h1`: the title of a record that is not there never lands.
	const headed = props.tone === "missing" && use(PageTitle) === undefined;
	const sentence = headed ? (
		<h1 className={cn(text({ role: "meta" }), MEASURE)}>{props.sentence}</h1>
	) : (
		<Text role="meta">{props.sentence}</Text>
	);
	// Only a failed read draws a mark: the alert.
	const mark =
		props.tone === "failed" ? (
			<span className={cn(EMPTY_MARK, MARK, DANGER)}>
				<Icon name="CircleAlert" fit="control" />
			</span>
		) : null;
	const { act } = props;
	// A Section that holds nothing and offers nothing says it as one sentence,
	// unframed; a mark or an act keeps the frame, and a fill keeps the box it
	// fills.
	if (framed && !props.fill && !mark && !act) return sentence;
	const create = props.tone === "rest";
	const words = <div className={cn(EMPTY_TEXT, TEXT)}>{sentence}</div>;
	if (framed)
		return (
			<div className={cn(EMPTY_FRAME, FRAME, props.fill && FILL)}>
				<div className={cn(EMPTY_COLUMN, COLUMN)}>
					{mark}
					{words}
					{act ? <ActButton act={act} kind="secondary" fit="bar" /> : null}
				</div>
			</div>
		);
	return (
		<div className={ALONE}>
			<div className={cn(EMPTY_COLUMN, COLUMN)}>
				{mark}
				{words}
				{/* A failed read's Retry and a missing one's Back are no create act: the hairline one, no plus. */}
				{act ? (
					<ActButton
						act={act}
						kind={create ? "primary" : "secondary"}
						fit="bar"
						icon={create ? "Plus" : undefined}
					/>
				) : null}
			</div>
		</div>
	);
}

// The empty state's act: a Button that runs it, or the hairline link a
// missing read's Back is.
function ActButton(props: {
	act: Act | LinkAct;
	kind: "primary" | "secondary";
	fit: "bar" | "body";
	icon?: IconName;
}) {
	const { act } = props;
	if ("href" in act)
		return <ButtonLink fit={props.fit} label={act.label} href={act.href} />;
	return (
		<ButtonBase
			act={props.kind}
			fit={props.fit}
			icon={props.icon}
			label={act.label}
			onAct={act.onAct}
			blocked={act.blocked}
		/>
	);
}
