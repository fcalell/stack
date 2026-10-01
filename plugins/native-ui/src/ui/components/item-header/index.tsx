import type { Part, StatusState } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { useEffect } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { useHeadingClaim } from "../../lib/heading";
import { LoadingRows } from "../../lib/loading";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { Count } from "../count";
import { Status } from "../status";

// A status fact with `onOpen` is a chip that opens what it means; a count
// fact is a number beside its word.
export type Fact =
	| Part
	| { status: StatusState; label?: string; onOpen?: () => void }
	| { count: number; label: string };

export interface ItemHeaderProps extends Closed {
	overline?: readonly Part[];
	title: Part;
	facts?: readonly Fact[];
	loading?: boolean;
}

function factKey(fact: Fact): string {
	if (typeof fact === "object" && "status" in fact) {
		return `${fact.status}:${fact.label ?? ""}`;
	}
	if (typeof fact === "object" && "count" in fact) {
		return `${fact.count}:${fact.label}`;
	}
	return partText(fact);
}

// An item's head: an overline over a bold title wrapping in full, the facts
// in a row below. Inside a `Screen` the title is the page's heading: the
// header claims it, loading included, so the title never draws twice.
export function ItemHeader({
	overline,
	title,
	facts,
	loading,
}: ItemHeaderProps) {
	const claim = useHeadingClaim();
	useEffect(() => {
		claim?.(true);
		return () => claim?.(false);
	}, [claim]);
	if (loading) return <LoadingRows />;
	return (
		<View className="gap-pair">
			{overline && overline.length > 0 ? (
				<RNText numberOfLines={1} className={text({ role: "meta" })}>
					{joinParts(overline, META_CUT)}
				</RNText>
			) : null}
			<RNText accessibilityRole="header" className={text({ role: "title" })}>
				{partText(title)}
			</RNText>
			{facts && facts.length > 0 ? (
				<View className="flex-row flex-wrap items-center gap-inside">
					{facts.map((fact) =>
						typeof fact === "object" && "status" in fact ? (
							<Status
								key={factKey(fact)}
								state={fact.status}
								label={fact.label}
								onOpen={fact.onOpen}
							/>
						) : typeof fact === "object" && "count" in fact ? (
							<View
								key={factKey(fact)}
								className="flex-row items-center gap-inside"
							>
								<Count value={fact.count} />
								<RNText className={text({ role: "meta" })}>{fact.label}</RNText>
							</View>
						) : (
							<RNText key={factKey(fact)} className={text({ role: "meta" })}>
								{partText(fact, META_CUT)}
							</RNText>
						),
					)}
				</View>
			) : null}
		</View>
	);
}
