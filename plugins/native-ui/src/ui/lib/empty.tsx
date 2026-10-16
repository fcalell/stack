import type { Act, IconName, LinkAct } from "@fcalell/ui-core/descriptors";
import {
	EMPTY_COLUMN,
	EMPTY_FRAME,
	EMPTY_MARK,
	EMPTY_TEXT,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { ButtonBase } from "../components/button/base";
import { Icon } from "../components/icon";
import { cn } from "./cn";
import { Ink } from "./ink";
import { navigate } from "./navigate";

// Alone in a page body it fills what the body leaves and centres there.
const ALONE = "grow items-center justify-center";
const COLUMN = "items-center";
const FRAME = "flex-row justify-center";
const FILL = "grow items-center";
const MARK = "items-center justify-center shrink-0";
const TEXT = "items-center";
const LINE = "text-center";

/** What a frame says when the read it holds is empty: the sentence, and the act that makes the first one. It stands only for the frame's own read, so a frame given none has no empty state. */
export interface Empty {
	/** What is missing and what the act makes (a sentence; wraps). */
	sentence: string;
	// The way to make the first one.
	act?: Act;
}

// The form an empty state draws, by the drawer that stands it: a `Pane`'s
// `page` (centred in what the body leaves), a `Section`'s or a collection's
// `frame` (a hairline frame, or one quiet sentence when only that is given).
export type EmptyFit = "page" | "frame";

// The empty state every empty `Pane`, `Section` and collection, a failed read
// and a missing one draw: the sentence and the act. Outside the package's
// exports: `fit` and `tone` are the drawers' alone.
export function EmptyBase(props: {
	fit: EmptyFit;
	tone: "rest" | "failed" | "missing";
	sentence: string;
	// A missing form's way back goes to a route, so it presses through
	// `navigate`.
	act?: Act | LinkAct;
	// The frame fills the box it stands in, its content centred there (a
	// chart's loaded height).
	fill?: boolean;
}) {
	const framed = props.fit === "frame";
	// Only a failed read draws a mark: the alert.
	const mark =
		props.tone === "failed" ? (
			<View className={cn(EMPTY_MARK, MARK)}>
				<Ink.Provider value="danger">
					<Icon name="CircleAlert" fit="control" />
				</Ink.Provider>
			</View>
		) : null;
	const { act } = props;
	// A Section that holds nothing and offers nothing says it as one sentence,
	// unframed; a mark or an act keeps the frame, and a fill keeps the box it
	// fills.
	if (framed && !props.fill && !mark && !act)
		return <RNText className={text({ role: "meta" })}>{props.sentence}</RNText>;
	const create = props.tone === "rest";
	const words = (
		<View className={cn(EMPTY_TEXT, TEXT)}>
			<RNText className={cn(text({ role: "meta" }), LINE)}>
				{props.sentence}
			</RNText>
		</View>
	);
	if (framed)
		return (
			<View className={cn(EMPTY_FRAME, FRAME, props.fill && FILL)}>
				<View className={cn(EMPTY_COLUMN, COLUMN)}>
					{mark}
					{words}
					{act ? <ActButton act={act} kind="secondary" fit="bar" /> : null}
				</View>
			</View>
		);
	return (
		<View className={ALONE}>
			<View className={cn(EMPTY_COLUMN, COLUMN)}>
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
			</View>
		</View>
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
			blocked={act.blocked}
		/>
	);
}
