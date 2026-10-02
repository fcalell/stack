import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import {
	BANNER_MAIN,
	BANNER_ROW,
	type BannerKind,
	banner,
	bannerGlyph,
	text,
} from "@fcalell/ui-core/variants";
import { useEffect, useId, useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { Icon } from "../icon/index.tsx";

const BOX = "flex flex-col justify-center";
// The line beside its act on the desktop, over it on touch.
const MAIN =
	"flex items-center touch:flex-col touch:items-start touch:gap-pair";
const LINE = "items-start flex grow min-w-0 touch:self-stretch";
// The glyph in a box of the sentence's line height, so it stays on the
// first line of a wrapped sentence.
const GLYPH_BOX = "flex shrink-0 items-center h-lh";
const SENTENCE = "min-w-0 grow";
const ACT_SLOT = "flex shrink-0";

const GLYPHS: Record<BannerKind, IconName> = {
	note: "Info",
	warn: "TriangleAlert",
	danger: "CircleAlert",
};

/** A sentence about the state of the page, the app or a Section, in the flow. */
export interface BannerProps extends Closed {
	/** What it tells: news (`note`, the default), a caution (`warn`), or a failure (`danger`, announced at once). */
	kind?: BannerKind;
	/** The sentence. */
	sentence: string;
	/** The one act it offers, at the line's end; a blocked act's reason draws on the banner's own line, under it. */
	act?: Act;
}

/** A tinted strip at its content's height: the kind's glyph in the kind's ink beside the sentence in the body ink, and the act, a hairline Button at the bar fit, beside the line on the desktop and under it on touch. */
export function Banner({ kind, sentence, act }: BannerProps) {
	const drawn = kind ?? "note";
	const reasonId = useId();
	const { touched } = useTouched();
	const blocked = act?.blocked;
	const [pressed, setPressed] = useState(false);
	useEffect(() => {
		if (blocked === undefined) setPressed(false);
	}, [blocked]);
	const host = useMemo(
		() =>
			blocked === undefined
				? undefined
				: { id: reasonId, press: () => setPressed(true) },
		[blocked, reasonId],
	);
	return (
		<div
			role={drawn === "danger" ? "alert" : "status"}
			className={cn(banner({ kind: drawn }), BOX)}
		>
			<div className={cn(BANNER_MAIN, MAIN)}>
				<div className={cn(BANNER_ROW, LINE)}>
					<span className={cn(GLYPH_BOX, bannerGlyph({ kind: drawn }))}>
						<Icon name={GLYPHS[drawn]} />
					</span>
					<p className={cn(text({ role: "body" }), SENTENCE)}>{sentence}</p>
				</div>
				{act ? (
					<span className={ACT_SLOT}>
						<ReasonHostContext value={host}>
							<Button
								act="secondary"
								fit="bar"
								label={act.label}
								onAct={act.onAct}
								loading={act.loading}
								blocked={blocked}
							/>
						</ReasonHostContext>
					</span>
				) : null}
			</div>
			{blocked === undefined ? null : (
				<Reason id={reasonId} shown={pressed || touched} end="desktop">
					{blocked}
				</Reason>
			)}
		</div>
	);
}
