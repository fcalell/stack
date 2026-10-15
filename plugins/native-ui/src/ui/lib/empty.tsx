import type { Act, IconName, LinkAct } from "@fcalell/ui-core/descriptors";
import {
	EMPTY_COLUMN,
	EMPTY_FRAME,
	EMPTY_MARK,
	EMPTY_TEXT,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import { ButtonBase } from "../components/button/base";
import { Icon } from "../components/icon";
import { cn } from "./cn";
import { Ink } from "./ink";
import { navigate } from "./navigate";

// Alone in a page body it fills what the body leaves and centres there;
// with children it stands at the body's top, centred across it.
const ALONE = "grow items-center justify-center";
const COLUMN = "items-center";
const ABOVE = "self-center";
const FRAME = "flex-row justify-center";
const FILL = "grow items-center";
const MARK_SLOT = "flex-row justify-center";
const MARK = "items-center justify-center shrink-0";
const INK = {
	rest: "ink-meta",
	missing: "ink-meta",
	failed: "danger",
} as const;
const TEXT = "items-center";
const LINE = "text-center";
// A first run's acts stretch across the column, its children under the act.
const ACTS = "gap-acts";

/** What a `Pane`, a `Section` or a first-run `Gate` says while it holds nothing yet. */
export interface EmptyProps {
	// The glyph in the mark's disc.
	icon?: IconName;
	/** The line over the sentence (a short phrase; wraps). */
	title?: string;
	/** What is missing and what the act makes (a sentence; wraps). */
	sentence: string;
	// The way to make the first one.
	act?: Act;
	// What still stands: under it on a page, in its acts column on a first
	// run.
	children?: ReactNode;
}

// The form an empty state draws, by the drawer that stands it: a `Pane`'s
// `page` (centred in what the body leaves, or at its top over its children), a
// first-run `Gate`'s `first`, a `Section`'s or a collection's `frame` (a
// hairline frame, or one quiet sentence when only that is given).
export type EmptyFit = "page" | "first" | "frame";

// The empty state every empty `Pane`, `Section` and collection, a failed read
// and a missing one draw. Outside the package's exports: `fit` and `tone` are
// the drawers' alone.
export function EmptyBase(props: {
	fit: EmptyFit;
	tone: "rest" | "failed" | "missing";
	icon?: IconName;
	title?: string;
	sentence: string;
	// A missing form's way back goes to a route, so it presses through
	// `navigate`.
	act?: Act | LinkAct;
	children?: ReactNode;
	// The frame fills the box it stands in, its content centred there (a
	// chart's loaded height).
	fill?: boolean;
}) {
	const { fit } = props;
	const framed = fit === "frame";
	const glyph = props.tone === "failed" ? "CircleAlert" : props.icon;
	const mark = glyph ? (
		<View className={cn(EMPTY_MARK, MARK)}>
			<Ink.Provider value={INK[props.tone]}>
				<Icon name={glyph} fit="control" />
			</Ink.Provider>
		</View>
	) : null;
	const sentence = (
		<RNText className={cn(text({ role: "meta" }), LINE)}>
			{props.sentence}
		</RNText>
	);
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
	if (quiet)
		return <RNText className={text({ role: "meta" })}>{props.sentence}</RNText>;
	// The drawer picks the form: the title's role and the act's look.
	if (framed || fit === "first") {
		const title =
			props.title === undefined ? null : (
				<RNText
					accessibilityRole={framed ? undefined : "header"}
					className={cn(
						framed
							? cn(text({ role: "body" }), textStrong({ role: "body" }))
							: text({ role: "title" }),
						LINE,
					)}
				>
					{props.title}
				</RNText>
			);
		const words = (
			<View className={cn(EMPTY_TEXT, TEXT)}>
				{title}
				{sentence}
			</View>
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
				<View className={cn(EMPTY_FRAME, FRAME, props.fill && FILL)}>
					<View className={cn(EMPTY_COLUMN, COLUMN)}>
						{mark}
						{words}
						{button}
						{props.children}
					</View>
				</View>
			);
		return (
			<View className={cn(EMPTY_COLUMN, ABOVE)}>
				{mark ? <View className={MARK_SLOT}>{mark}</View> : null}
				{words}
				{button || props.children ? (
					<View className={ACTS}>
						{button}
						{props.children}
					</View>
				) : null}
			</View>
		);
	}
	const create = props.tone === "rest";
	const column = (
		<View className={cn(EMPTY_COLUMN, COLUMN, props.children && ABOVE)}>
			{mark}
			<View className={cn(EMPTY_TEXT, TEXT)}>
				{props.title === undefined ? null : (
					<RNText
						accessibilityRole="header"
						className={cn(text({ role: "heading" }), LINE)}
					>
						{props.title}
					</RNText>
				)}
				{sentence}
			</View>
			{/* A failed read's Retry and a missing one's Back are no create act: the hairline one, no plus. */}
			{act ? (
				<ActButton
					act={act}
					kind={create ? "primary" : "secondary"}
					fit="bar"
					icon={create ? "Plus" : undefined}
				/>
			) : null}
		</View>
	);
	if (!props.children) return <View className={ALONE}>{column}</View>;
	return (
		<>
			{column}
			{props.children}
		</>
	);
}

// The empty state's act: a Button that runs it, or the hairline one that goes
// to the route a missing form's way back names.
function ActButton(props: {
	act: Act | LinkAct;
	kind: "primary" | "secondary";
	fit: "bar" | "body";
	icon?: IconName;
}) {
	const { act } = props;
	if ("href" in act) {
		const { href } = act;
		return (
			<ButtonBase
				act="secondary"
				fit={props.fit}
				label={act.label}
				onAct={() => navigate(href)}
			/>
		);
	}
	return (
		<ButtonBase
			act={props.kind}
			fit={props.fit}
			icon={props.icon}
			label={act.label}
			onAct={act.onAct}
			failed={act.failed}
			blocked={act.blocked}
		/>
	);
}
