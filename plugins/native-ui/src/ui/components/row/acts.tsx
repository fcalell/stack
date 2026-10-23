import {
	type Datum,
	isSelection,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { IconLinkAct, LinkAct } from "@fcalell/ui-core/descriptors";
import { paintText } from "@fcalell/ui-core/paint";
import { endedReason } from "@fcalell/ui-core/read";
import { pressStands } from "@fcalell/ui-core/reason";
import { text } from "@fcalell/ui-core/variants";
import { useMemo } from "react";
import { type LayoutChangeEvent, Text as RNText, View } from "react-native";
import type { Act, IconAct, MenuEntry } from "../../lib/act";
import { asAct, asIconAct, wiringOf } from "../../lib/act";
import { FadingText, lineIn } from "../../lib/motion";
import { moreMenu } from "../../lib/read";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { ButtonBase } from "../button/base";
import { IconButtonBase } from "../button/glyph";
import { MenuBase } from "../menu/base";

const NOOP = () => {};
const MENU_SLOT = "flex-row shrink-0";

// A blocked act's reason draws on the row's own line, so the act keeps its
// place; the act is handed the host.
export function useReasonLine(blocked: string | undefined) {
	const { touched } = useTouched();
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	const line =
		blocked !== undefined && (pressed || touched) ? (
			<FadingText
				key={blocked}
				entering={lineIn()}
				className={text({ role: "meta" })}
			>
				{blocked}
			</FadingText>
		) : null;
	return { host, line };
}

// Whether the row has a more act to draw: a selection may still answer none,
// the box standing meanwhile.
export function hasMore(more: Datum<readonly MenuEntry[] | undefined>) {
	return isSelection(more) || Boolean(more?.length);
}

// The act waiting for its read: a labelled act's box, or an icon act's.
export function PaintedAct({
	at,
	icon = false,
}: {
	at: number;
	icon?: boolean;
}) {
	if (icon) return <IconButtonBase icon="Ellipsis" label="" painted />;
	return <ButtonBase act="secondary" label={paintText("word", at)} painted />;
}

// The row's act as its own datum draws it: waiting while the read lands, the
// act once it did, and blocked with the sentence once the read ended, never a
// false yes.
function useOffer(act: Datum<Act | LinkAct | undefined>) {
	const [offer] = useSelections([act]);
	const words = useWords();
	const ended = offer.painted ? endedReason(words, offer.phase) : undefined;
	const given: Act | LinkAct | undefined =
		ended === undefined
			? offer.painted
				? undefined
				: (offer.value as Act | LinkAct | undefined)
			: { label: ended, onAct: NOOP };
	return {
		waits: offer.painted && ended === undefined,
		given,
		blocked: (given && "blocked" in given ? given.blocked : undefined) ?? ended,
	};
}

// The row's act at its end: an icon act when it has an `icon`, else a labelled
// button. A press on it while blocked tells the row whose line draws the reason.
export function RowAct(props: {
	act: Datum<Act | LinkAct | undefined>;
	stand: (reason: string) => void;
	at: number;
}) {
	const { act, stand, at } = props;
	useDrawsFailure([act]);
	const { waits, given, blocked } = useOffer(act);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press: () => stand(blocked) }),
		[blocked, stand],
	);
	if (waits) return <PaintedAct at={at} />;
	if (!given) return null;
	if (given.icon !== undefined) {
		const icon = asIconAct(given as IconAct | IconLinkAct);
		if (blocked !== undefined)
			return (
				<IconButtonBase
					icon={icon.icon}
					label={icon.label}
					onAct={() => stand(blocked)}
				/>
			);
		return <Button glyph {...icon} />;
	}
	const labelled = asAct(given);
	return (
		<ReasonHostContext.Provider value={host}>
			<ButtonBase
				act={labelled.destructive ? "destructive" : "secondary"}
				label={labelled.label}
				onAct={labelled.onAct}
				blocked={blocked}
				{...wiringOf(labelled)}
			/>
		</ReasonHostContext.Provider>
	);
}

// The reason the row's act is blocked under, on the row's own line: shown once
// the act was pressed while blocked, or its form is touched.
export function ActLine(props: {
	act: Datum<Act | LinkAct | undefined>;
	stood: string | undefined;
}) {
	const { blocked } = useOffer(props.act);
	const { touched } = useTouched();
	if (blocked === undefined) return null;
	if (!(pressStands(blocked, props.stood) || touched)) return null;
	return <RNText className={text({ role: "meta" })}>{blocked}</RNText>;
}

// The row's more act: painted while its read lands, the one blocked item with
// the sentence once it ended, the square left blank when it answers none. A
// labelled act that folded stands first among its items, as a Pane head's
// folded acts do: its own datum draws it (painted while it waits, blocked once
// its read ended).
export function RowMore(props: {
	more: Datum<readonly MenuEntry[] | undefined> | undefined;
	folded: Datum<Act | LinkAct | undefined> | undefined;
	named: string;
	/** The menu's layout, which the row's fold reads. */
	onLayout: (event: LayoutChangeEvent) => void;
}) {
	useDrawsFailure([props.more]);
	const [offer, act] = useSelections([props.more, props.folded]);
	const words = useWords();
	const { painted, items } = moreMenu(words, offer, act);
	const label = `${words.more} ${props.named}`;
	if (painted)
		return (
			<View onLayout={props.onLayout} className={MENU_SLOT}>
				<MenuBase label={label} title={props.named} items={[]} painted />
			</View>
		);
	if (!items.length) return null;
	return (
		<View onLayout={props.onLayout} className={MENU_SLOT}>
			<MenuBase label={label} title={props.named} items={items} />
		</View>
	);
}

// An entry's act beside its input: a labelled button, painted while the row is.
export function ActButton(props: {
	act: Act;
	host: ReturnType<typeof useReasonLine>["host"];
	painted: boolean;
	at: number;
}) {
	const { act, host, painted, at } = props;
	if (painted) return <PaintedAct at={at} />;
	return (
		<ReasonHostContext.Provider value={host}>
			<ButtonBase
				act={act.destructive ? "destructive" : "secondary"}
				label={act.label}
				onAct={act.onAct}
				blocked={act.blocked}
				{...wiringOf(act)}
			/>
		</ReasonHostContext.Provider>
	);
}
