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
import { type ReactNode, useContext } from "react";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { PageTitle } from "../../lib/frame";
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { SectionContext } from "../../lib/section";
import { Button } from "../button";
import { Icon } from "../icon";

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

// The empty state every EmptyState, a failed read and a missing one draw.
// Outside the package's exports: `tone` is the reads' alone.
export function EmptyStateBase(props: {
	tone: "rest" | "failed" | "missing";
	icon?: IconName;
	title?: string;
	sentence: string;
	act?: Act;
	children?: ReactNode;
	// The frame fills the box it stands in, its content centred there (a
	// chart's loaded height).
	fill?: boolean;
}) {
	// In a Section it stands framed; in a Group the card is its frame.
	const inGroup = useContext(GroundContext) === "group";
	const section = useContext(SectionContext) !== undefined;
	const framed = inGroup || section;
	const page = useContext(PageTitle) !== undefined;
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
	// Where it stands picks the form: the title's role and the act's look.
	if (framed || !page) {
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
				<View
					className={cn(
						inGroup ? EMPTY_CARD : EMPTY_FRAME,
						FRAME,
						props.fill && FILL,
					)}
				>
					<View className={cn(EMPTY_COLUMN, COLUMN)}>
						{mark}
						{words}
						{button}
						{props.children}
					</View>
				</View>
			);
		return (
			<View className={EMPTY_COLUMN}>
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
				<Button
					act={create ? "primary" : "secondary"}
					fit="bar"
					icon={create ? "Plus" : undefined}
					label={act.label}
					onAct={act.onAct}
					loading={act.loading}
					blocked={act.blocked}
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
