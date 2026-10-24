import {
	type Datum,
	isSelection,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { IconLinkAct } from "@fcalell/ui-core/descriptors";
import { paintText } from "@fcalell/ui-core/paint";
import { endedReason } from "@fcalell/ui-core/read";
import { pressStands } from "@fcalell/ui-core/reason";
import { useMemo } from "react";
import {
	type Act,
	type IconAct,
	type MenuEntry,
	wiringOf,
} from "../../lib/act.ts";
import { moreMenu } from "../../lib/read.tsx";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { IconActFace } from "../button/face.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Reason } from "../button/reason.tsx";
import { MenuBase } from "../menu/base.tsx";

const NOOP = () => {};

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
		blocked === undefined ? null : (
			<Reason shown={pressed || touched}>{blocked}</Reason>
		);
	return { host, line };
}

/** Whether the row has a more act to draw: a selection may still answer none, the box standing meanwhile. */
export function hasMore(more: Datum<readonly MenuEntry[] | undefined>) {
	return isSelection(more) || Boolean(more?.length);
}

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
function useOffer(act: Datum<IconAct | IconLinkAct | undefined>) {
	const [offer] = useSelections([act]);
	const words = useWords();
	const ended = offer.painted ? endedReason(words, offer.phase) : undefined;
	const given: IconAct | IconLinkAct | undefined =
		ended === undefined
			? offer.painted
				? undefined
				: offer.value
			: { label: ended, icon: "CircleAlert", blocked: ended, onAct: NOOP };
	return {
		waits: offer.painted && ended === undefined,
		given,
		blocked: (given && "blocked" in given ? given.blocked : undefined) ?? ended,
	};
}

// The row's act at its end, its icon; a press on it while blocked tells the
// row whose line draws the reason.
export function RowAct(props: {
	act: Datum<IconAct | IconLinkAct | undefined>;
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
	if (waits) return <PaintedAct at={at} icon />;
	if (!given) return null;
	return (
		<ReasonHostContext value={host}>
			<IconActFace act={given} />
		</ReasonHostContext>
	);
}

// The reason the row's act is blocked under, on the row's own line: shown once
// the act was pressed while blocked, or its form is touched.
export function ActLine(props: {
	act: Datum<IconAct | IconLinkAct | undefined>;
	stood: string | undefined;
}) {
	const { blocked } = useOffer(props.act);
	const { touched } = useTouched();
	if (blocked === undefined) return null;
	return (
		<Reason shown={pressStands(blocked, props.stood) || touched}>
			{blocked}
		</Reason>
	);
}

// The row's more act: painted while its read lands, the one blocked item with
// the sentence once it ended, nothing when it answers none.
export function RowMore(props: {
	more: Datum<readonly MenuEntry[] | undefined> | undefined;
	named: string;
	tabIndex?: -1;
}) {
	useDrawsFailure([props.more]);
	const [offer] = useSelections([props.more]);
	const words = useWords();
	const { painted, items } = moreMenu(words, offer);
	const label = `${words.more} ${props.named}`;
	if (painted)
		return <MenuBase label={label} title={props.named} items={[]} painted />;
	if (!items.length) return null;
	return (
		<MenuBase
			label={label}
			title={props.named}
			items={items}
			tabIndex={props.tabIndex}
		/>
	);
}

export function ActButton(props: {
	act: Act;
	host: ReturnType<typeof useReasonLine>["host"];
	painted: boolean;
	at: number;
}) {
	const { act, host, painted, at } = props;
	if (painted) return <PaintedAct at={at} />;
	return (
		<ReasonHostContext value={host}>
			<ButtonBase
				act={act.destructive ? "destructive" : "secondary"}
				label={act.label}
				onAct={act.onAct}
				blocked={act.blocked}
				{...wiringOf(act)}
			/>
		</ReasonHostContext>
	);
}
