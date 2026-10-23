import type { IconName, LinkAct } from "@fcalell/ui-core/descriptors";
import {
	CARD_PART,
	EMPTY_COLUMN,
	EMPTY_MARK,
	EMPTY_PART,
	EMPTY_TEXT,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { ButtonBase } from "../components/button/base";
import { Icon } from "../components/icon";
import type { Act } from "./act";
import { asAct, wiringOf } from "./act";
import { cn } from "./cn";
import { Ink } from "./ink";

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
	// The way to make the first one: an act that runs, or a `{ label, href }` that goes to a route, either drawn as the create act.
	act?: Act | LinkAct;
}

// The form an empty state draws, by the drawer that stands it: a `Pane`'s
// `page` (centred in what the body leaves), a `Section`'s or a collection's
// `frame` (a hairline frame; a collection's, one quiet sentence when only that is given).
export type EmptyFit = "page" | "part" | "frame";

// The empty state every empty `Pane`, `Section` and collection, a failed read
// and a missing one draw: the sentence and the act. Outside the package's
// exports: `fit` and `tone` are the drawers' alone.
export function EmptyBase(props: {
	fit: EmptyFit;
	tone: "rest" | "failed" | "missing";
	// None is the Section's empty that offers an act in place of a sentence.
	sentence?: string;
	// A missing form's way back goes to a route, so it presses through
	// `navigate`.
	act?: Act | LinkAct;
	// The frame fills the box it stands in, its content centred there (a
	// chart's loaded height).
	fill?: boolean;
}) {
	const framed = props.fit !== "page";
	// A missing form is the page's header, the title of the record that is not
	// there never landing.
	const role = props.tone === "missing" ? "header" : undefined;
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
	// One form everywhere: the sentence over its act, both centred, at a card's
	// inset: inside the card it stands for, or on a card of its own.
	const create = props.tone === "rest";
	const words =
		props.sentence === undefined ? null : (
			<View className={cn(EMPTY_TEXT, TEXT)}>
				<RNText
					accessibilityRole={role}
					className={cn(text({ role: "meta" }), LINE)}
				>
					{props.sentence}
				</RNText>
			</View>
		);
	if (framed)
		return (
			<View
				className={cn(
					props.fit === "part" ? EMPTY_PART : CARD_PART,
					FRAME,
					props.fill && FILL,
				)}
			>
				<View className={cn(EMPTY_COLUMN, COLUMN)}>
					{mark}
					{words}
					{act ? <ActButton act={act} kind="secondary" /> : null}
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
						icon={create ? "Plus" : undefined}
					/>
				) : null}
			</View>
		</View>
	);
}

// The empty state's act: a Button that runs it, or one that goes to the route
// a missing form's way back or a create act names.
function ActButton(props: {
	act: Act | LinkAct;
	kind: "primary" | "secondary";
	icon?: IconName;
}) {
	const act = asAct(props.act);
	return (
		<ButtonBase
			act={props.kind}
			icon={props.icon}
			label={act.label}
			onAct={act.onAct}
			{...wiringOf(act)}
			blocked={act.blocked}
		/>
	);
}
