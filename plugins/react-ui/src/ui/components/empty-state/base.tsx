import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import {
	EMPTY_CARD,
	EMPTY_COLUMN,
	EMPTY_FRAME,
	EMPTY_MARK,
	EMPTY_TEXT,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import { PageTitle } from "../../lib/frame.ts";
import { GroundContext } from "../../lib/ground.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { SectionContext } from "../../lib/section.ts";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { Text } from "../text/index.tsx";

// Alone in a page body it fills what the body leaves and centres there;
// with children it stands at the body's top, centred across it.
const ALONE = "flex grow items-center justify-center";
const COLUMN = "flex flex-col items-center text-center";
const ABOVE = "self-center";
const FRAME = "flex justify-center";
const FIRST = "flex flex-col text-center";
const MARK_SLOT = "flex justify-center";
const MARK = "inline-flex items-center justify-center shrink-0";
const INK = { rest: "text-ink-meta", failed: "text-danger" } as const;
const TEXT = "flex flex-col items-center";
// A first run's acts stretch across the column, its children under the act.
const ACTS = "flex flex-col gap-acts";

/** The empty state every EmptyState and a failed QueryBoundary draws. Outside the package's exports: `tone` is the boundary's alone. */
export function EmptyStateBase(props: {
	tone: "rest" | "failed";
	icon?: IconName;
	title?: string;
	sentence: string;
	act?: Act;
	children?: ReactNode;
}) {
	// In a Section it stands framed; in a Group the card is its frame.
	const inGroup = use(GroundContext) === "group";
	const section = use(SectionContext) !== undefined;
	const framed = inGroup || section;
	const page = use(PageTitle) !== undefined;
	const level = use(HeadingContext);
	const glyph = props.tone === "failed" ? "CircleAlert" : props.icon;
	const mark = glyph ? (
		<span className={cn(EMPTY_MARK, MARK, INK[props.tone])}>
			<Icon name={glyph} fit="control" />
		</span>
	) : null;
	const { act } = props;
	// Where it stands picks the form: the title's role and the act's look.
	if (framed || !page) {
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
			<Button
				act={framed ? "secondary" : "primary"}
				fit={framed ? "bar" : "body"}
				label={act.label}
				onAct={act.onAct}
				loading={act.loading}
				blocked={act.blocked}
			/>
		) : null;
		if (framed)
			return (
				<div className={cn(inGroup ? EMPTY_CARD : EMPTY_FRAME, FRAME)}>
					<div className={cn(EMPTY_COLUMN, COLUMN)}>
						{mark}
						{words}
						{button}
						{props.children}
					</div>
				</div>
			);
		return (
			<div className={cn(EMPTY_COLUMN, FIRST)}>
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
	const column = (
		<div className={cn(EMPTY_COLUMN, COLUMN, props.children && ABOVE)}>
			{mark}
			<div className={cn(EMPTY_TEXT, TEXT)}>
				{props.title === undefined ? null : (
					<Heading className={text({ role: "heading" })}>{props.title}</Heading>
				)}
				<Text role="meta">{props.sentence}</Text>
			</div>
			{/* A failed boundary's retry is no create act: the hairline one, no plus. */}
			{act ? (
				<Button
					act={props.tone === "failed" ? "secondary" : "primary"}
					fit="bar"
					icon={props.tone === "failed" ? undefined : "Plus"}
					label={act.label}
					onAct={act.onAct}
					loading={act.loading}
					blocked={act.blocked}
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
