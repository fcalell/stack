import type { Part, StatusState } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { LoadingRows } from "../../lib/loading";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { Status } from "../status";

export type Fact = Part | { status: StatusState; label?: string };

export interface ItemHeaderProps extends Closed {
	overline?: readonly Part[];
	title: Part;
	facts?: readonly Fact[];
	loading?: boolean;
}

function factKey(fact: Fact): string {
	return typeof fact === "object" && "status" in fact
		? `${fact.status}:${fact.label ?? ""}`
		: partText(fact);
}

// An item's head: an overline over a bold title, the facts in a row below.
export function ItemHeader({
	overline,
	title,
	facts,
	loading,
}: ItemHeaderProps) {
	if (loading) return <LoadingRows />;
	return (
		<View className="gap-pair">
			{overline && overline.length > 0 ? (
				<RNText numberOfLines={1} className={text({ role: "meta" })}>
					{joinParts(overline, META_CUT)}
				</RNText>
			) : null}
			<RNText numberOfLines={2} className={text({ role: "title" })}>
				{partText(title)}
			</RNText>
			{facts && facts.length > 0 ? (
				<View className="flex-row flex-wrap items-center gap-row">
					{facts.map((fact) =>
						typeof fact === "object" && "status" in fact ? (
							<Status
								key={factKey(fact)}
								state={fact.status}
								label={fact.label}
							/>
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
