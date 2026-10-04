import { cn } from "@fcalell/ui-core/cn";
import { formatterFor } from "@fcalell/ui-core/format";
import { filled, METER_NEAR } from "@fcalell/ui-core/tokens";
import {
	FIGURES,
	METER,
	METER_HEAD,
	METER_ITEM,
	METER_TRACK,
	meterFill,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";
import { useWords } from "../../lib/words.tsx";
import { MeterWait } from "./wait.tsx";

const STACK = "flex flex-col min-w-0";
const HEAD = "flex items-center";
const LABEL = "min-w-0 grow truncate";
const SHARE = "shrink-0";
const TRACK = "overflow-hidden";

// The level a share stands at: past the max over, from `METER_NEAR` near.
function levelOf(share: number) {
	if (share > 1) return "over";
	if (share >= METER_NEAR) return "near";
	return "under";
}

/** A share of a limit: how much of a quota is used. */
export interface MeterProps extends Closed {
	/** What is measured. */
	label: string;
	/** How much is used; past `max` the meter is over. */
	value: number;
	/** The limit. */
	max: number;
	/** What the value counts (`GB`, `requests`), read aloud with it. */
	unit?: string;
	/** A line under the bar: the value in words, when it resets. */
	meta?: string;
	/** The label, share, bar and meta as bars in their line boxes. */
	loading?: boolean;
}

/** The label at body 500 with the share in percent at its end, the bar under them filling by the share in the meta ink, `warn` once near full and `danger` once over, the meta line under the bar. In a `Group` it stands as one of its items at the card's inset, the group's hairline between. */
export function Meter({ label, value, max, unit, meta, loading }: MeterProps) {
	const words = useWords();
	// In a Group the meter is one of its items, at the card's inset.
	const item = use(GroundContext) === "group" && METER_ITEM;
	if (loading) return <MeterWait busy meta />;
	const share = max > 0 ? value / max : 0;
	const number = formatterFor("number");
	const percent = formatterFor("number", undefined, {
		style: "percent",
		maximumFractionDigits: 0,
	}).format(share);
	// A figure with its unit, when the meter counts one.
	const unitOf = (figure: string) => (unit ? `${figure} ${unit}` : figure);
	const amount = unitOf(
		filled(words.meterValue, {
			value: number.format(value),
			max: number.format(max),
		}),
	);
	const rest =
		share > 1
			? filled(words.meterOver, { amount: unitOf(number.format(value - max)) })
			: percent;
	return (
		// biome-ignore lint/a11y/useSemanticElements: a <meter> holds no children
		<div
			role="meter"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={Math.min(value, max)}
			aria-valuetext={`${amount}, ${rest}`}
			className={cn(METER, item, STACK)}
		>
			<div className={cn(METER_HEAD, HEAD)}>
				<span
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL,
					)}
				>
					{label}
				</span>
				<span className={cn(text({ role: "meta" }), FIGURES, SHARE)}>
					{percent}
				</span>
			</div>
			<div className={cn(METER_TRACK, TRACK)}>
				{share > 0 ? (
					<div
						className={meterFill({ level: levelOf(share) })}
						// The fill's width is the data's, the value's share of the max.
						style={{ width: `${Math.min(share, 1) * 100}%` }}
					/>
				) : null}
			</div>
			{meta ? <p className={text({ role: "meta" })}>{meta}</p> : null}
		</div>
	);
}
