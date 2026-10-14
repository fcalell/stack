import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconName, LinkAct } from "@fcalell/ui-core/descriptors";
import {
	EMPTY_COLUMN,
	EMPTY_FRAME,
	EMPTY_MARK,
	EMPTY_TEXT,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import { Button } from "../components/button/index.tsx";
import { ButtonLink } from "../components/button/link.tsx";
import { Icon } from "../components/icon/index.tsx";
import { Text } from "../components/text/index.tsx";
import { HeadingContext } from "./heading.ts";

// Alone in a page body it fills what the body leaves and centres there;
// with children it stands at the body's top, centred across it.
const ALONE = "flex grow items-center justify-center";
const COLUMN = "flex flex-col items-center text-center";
const ABOVE = "self-center";
const FRAME = "flex justify-center";
const FILL = "grow items-center";
const FIRST = "flex flex-col text-center";
const MARK_SLOT = "flex justify-center";
const MARK = "inline-flex items-center justify-center shrink-0";
const INK = {
	rest: "text-ink-meta",
	missing: "text-ink-meta",
	failed: "text-danger",
} as const;
const TEXT = "flex flex-col items-center";
// A first run's acts stretch across the column, its children under the act.
const ACTS = "flex flex-col gap-acts";

/** What a `Pane`, a `Section` or a first-run `Gate` says while it holds nothing yet. */
export interface EmptyProps {
	/** The glyph in the mark's disc. */
	icon?: IconName;
	/** The line over the sentence (a short phrase; wraps). */
	title?: string;
	/** What is missing and what the act makes (a sentence; wraps). */
	sentence: string;
	/** The way to make the first one. */
	act?: Act;
	/** What still stands: under it on a page, in its acts column on a first run. */
	children?: ReactNode;
}

/** The form an empty state draws, by the drawer that stands it: a `Pane`'s `page` (centred in what the body leaves, or at its top over its children), a first-run `Gate`'s `first`, a `Section`'s or a collection's `frame` (a hairline frame, or one quiet sentence when only that is given). */
export type EmptyFit = "page" | "first" | "frame";

/** The empty state every empty `Pane`, `Section` and collection, a failed read and a missing one draw. Outside the package's exports: `fit` and `tone` are the drawers' alone. */
export function EmptyBase(props: {
	fit: EmptyFit;
	tone: "rest" | "failed" | "missing";
	icon?: IconName;
	title?: string;
	sentence: string;
	// A missing form's way back goes to a route, so it is a link.
	act?: Act | LinkAct;
	children?: ReactNode;
	// The frame fills the box it stands in, its content centred there (a
	// chart's loaded height).
	fill?: boolean;
}) {
	const { fit } = props;
	const framed = fit === "frame";
	const level = use(HeadingContext);
	const glyph = props.tone === "failed" ? "CircleAlert" : props.icon;
	const mark = glyph ? (
		<span className={cn(EMPTY_MARK, MARK, INK[props.tone])}>
			<Icon name={glyph} fit="control" />
		</span>
	) : null;
	const { act } = props;
	// A Section that holds nothing and offers nothing says it as one sentence,
	// unframed; a title, mark, act or children keep the frame, and a fill keeps
	// the box it fills.
	const quiet =
		fit === "frame" &&
		!props.fill &&
		props.title === undefined &&
		!mark &&
		!act &&
		!props.children;
	if (quiet) return <Text role="meta">{props.sentence}</Text>;
	// The drawer picks the form: the title's role and the act's look.
	if (framed || fit === "first") {
		const Title = framed ? "p" : "h1";
		const title =
			props.title === undefined ? null : (
				<Title
					className={
						framed
							? cn(text({ role: "body" }), textStrong({ role: "body" }))
							: text({ role: "title" })
					}
				>
					{props.title}
				</Title>
			);
		const words = (
			<div className={cn(EMPTY_TEXT, TEXT)}>
				{title}
				<Text role="meta">{props.sentence}</Text>
			</div>
		);
		const button = act ? (
			<ActButton
				act={act}
				kind={framed || props.tone !== "rest" ? "secondary" : "primary"}
				fit={framed ? "bar" : "body"}
			/>
		) : null;
		if (framed)
			return (
				<div className={cn(EMPTY_FRAME, FRAME, props.fill && FILL)}>
					<div className={cn(EMPTY_COLUMN, COLUMN)}>
						{mark}
						{words}
						{button}
						{props.children}
					</div>
				</div>
			);
		return (
			<div className={cn(EMPTY_COLUMN, FIRST, ABOVE)}>
				{mark ? <span className={MARK_SLOT}>{mark}</span> : null}
				{words}
				{button || props.children ? (
					<div className={ACTS}>
						{button}
						{props.children}
					</div>
				) : null}
			</div>
		);
	}
	const Heading = `h${level}` as const;
	const create = props.tone === "rest";
	const column = (
		<div className={cn(EMPTY_COLUMN, COLUMN, props.children && ABOVE)}>
			{mark}
			<div className={cn(EMPTY_TEXT, TEXT)}>
				{props.title === undefined ? null : (
					<Heading className={text({ role: "heading" })}>{props.title}</Heading>
				)}
				<Text role="meta">{props.sentence}</Text>
			</div>
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
	);
	if (!props.children) return <div className={ALONE}>{column}</div>;
	return (
		<>
			{column}
			{props.children}
		</>
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
		<Button
			act={props.kind}
			fit={props.fit}
			icon={props.icon}
			label={act.label}
			onAct={act.onAct}
			loading={act.loading}
			blocked={act.blocked}
		/>
	);
}
